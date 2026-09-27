import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

/**
 * Reader for Typecho's backup file (后台「备份」导出的 .dat).
 *
 * The format is a binary stream, not XML — verified against Typecho's
 * `var/Widget/Backup.php` and `var/Typecho/Common.php`:
 *
 *   [21B header "%TYPECHO_BACKUP_XXXX%"] [record…] [21B footer = same header]
 *
 * `Common::buildBackupBuffer()` frames every record as:
 *
 *   pack('vvV', type, headerLen, bodyLen)   // 8 bytes, little-endian
 *   . json_encode(schema)                   // schema: field name → byte length | null
 *   . body                                  // values concatenated, no separators
 *   . md5(meta . header . body)             // 32 ASCII hex chars
 *
 * `extractBackupBuffer()` reads 6-byte meta unpacked as `v3` when the header
 * version is "FILE" (the body length is then derived by summing the schema
 * lengths — long article bodies exceed 16 bits), and 8 bytes otherwise. Both
 * variants are supported here; the real-world v1 file uses `0001` (8 bytes).
 */

export type TypechoRecord = Record<string, string | null>

export type TypechoBackup = {
  version: string
  /** Table name → records (only the six core tables are decoded). */
  tables: Record<TypechoTable, TypechoRecord[]>
  /** Type ids seen that are not part of the core table map (plugin records). */
  unknownTypes: number[]
  /** Records whose md5 checksum did not match. */
  checksumFailures: number
}

export const TYPECHO_TABLES = {
  1: 'contents',
  2: 'comments',
  3: 'metas',
  4: 'relationships',
  5: 'users',
  6: 'fields',
} as const

export type TypechoTable = (typeof TYPECHO_TABLES)[keyof typeof TYPECHO_TABLES]

const HEADER_LENGTH = 21
const HEADER_PATTERN = /^%TYPECHO_BACKUP_[A-Z0-9]{4}%$/

/** Typecho stores boolean-ish integers; null means SQL NULL. */
function toRecord(schema: Record<string, number | null>, body: Buffer): TypechoRecord {
  const record: TypechoRecord = {}
  let offset = 0
  for (const key of Object.keys(schema)) {
    const length = schema[key]
    record[key] = length === null ? null : body.subarray(offset, offset + length).toString('utf8')
    offset += length ?? 0
  }
  return record
}

export function parseBackup(buffer: Buffer): TypechoBackup {
  if (buffer.length < HEADER_LENGTH * 2) {
    throw new Error('备份文件太小，看起来不是 Typecho 备份文件。')
  }

  const header = buffer.subarray(0, HEADER_LENGTH).toString('latin1')
  const footer = buffer.subarray(buffer.length - HEADER_LENGTH).toString('latin1')
  if (!HEADER_PATTERN.test(header)) {
    throw new Error(`备份文件头标记无效（读取到 ${JSON.stringify(header)}），请确认是 Typecho 后台导出的 .dat 文件。`)
  }
  if (footer !== header) {
    throw new Error('备份文件头尾标记不一致，文件可能损坏或被截断。')
  }

  const version = header.slice(16, 20)
  const metaLength = version === 'FILE' ? 6 : 8

  const tables: TypechoBackup['tables'] = { contents: [], comments: [], metas: [], relationships: [], users: [], fields: [] }
  const unknownTypes: number[] = []
  let checksumFailures = 0
  let offset = HEADER_LENGTH
  const limit = buffer.length - HEADER_LENGTH

  while (offset + metaLength + 32 <= limit) {
    const type = buffer.readUInt16LE(offset)
    const headerLength = buffer.readUInt16LE(offset + 2)
    let bodyLength = metaLength === 6 ? 0 : buffer.readUInt32LE(offset + 4)
    const headerStart = offset + metaLength
    const headerEnd = headerStart + headerLength
    const headerText = buffer.subarray(headerStart, headerEnd).toString('utf8')

    let schema: Record<string, number | null>
    try {
      schema = JSON.parse(headerText) as Record<string, number | null>
    } catch {
      throw new Error(`第 ${offset} 字节处的记录头不是合法 JSON，备份格式无法识别：${headerText.slice(0, 80)}`)
    }

    if (metaLength === 6) {
      bodyLength = Object.values(schema).reduce<number>((total, length) => total + (length ?? 0), 0)
    }

    const bodyStart = headerEnd
    const bodyEnd = bodyStart + bodyLength
    if (bodyEnd + 32 > limit) {
      throw new Error(`第 ${offset} 字节处的记录体超出文件范围，备份可能不完整。`)
    }
    const body = buffer.subarray(bodyStart, bodyEnd)

    const expected = buffer.subarray(bodyEnd, bodyEnd + 32).toString('latin1')
    const actual = createHash('md5')
      .update(buffer.subarray(offset, headerStart))
      .update(Buffer.from(headerText, 'utf8'))
      .update(body)
      .digest('hex')
    if (expected !== actual) checksumFailures += 1

    const table = TYPECHO_TABLES[type as keyof typeof TYPECHO_TABLES]
    if (table) tables[table].push(toRecord(schema, body))
    else if (!unknownTypes.includes(type)) unknownTypes.push(type)

    offset = bodyEnd + 32
  }

  if (offset !== limit) {
    throw new Error(`解析在偏移 ${offset} 处提前结束（应为 ${limit}），备份格式与预期不符。`)
  }

  return { version, tables, unknownTypes, checksumFailures }
}

export async function readBackup(file: string): Promise<TypechoBackup> {
  return parseBackup(await readFile(file))
}

/**
 * Writer used by the self-test: builds a backup file in the same framing so the
 * parser can be verified without depending on a real export. Schema lengths are
 * computed from the values, which is how Typecho's exporter builds them.
 */
export function encodeBackup(
  version: string,
  records: { type: number; fields: [string, string | null][] }[],
): Buffer {
  const header = `%TYPECHO_BACKUP_${version}%`
  const parts: Buffer[] = [Buffer.from(header, 'latin1')]

  for (const record of records) {
    const schema: Record<string, number | null> = {}
    for (const [name, value] of record.fields) schema[name] = value === null ? null : Buffer.byteLength(value, 'utf8')
    const headerBuffer = Buffer.from(JSON.stringify(schema), 'utf8')
    const bodyBuffer = Buffer.concat(
      record.fields.map(([, value]) => (value === null ? Buffer.alloc(0) : Buffer.from(value, 'utf8'))),
    )
    const meta = Buffer.alloc(version === 'FILE' ? 6 : 8)
    meta.writeUInt16LE(record.type, 0)
    meta.writeUInt16LE(headerBuffer.length, 2)
    if (version === 'FILE') meta.writeUInt16LE(bodyBuffer.length, 4)
    else meta.writeUInt32LE(bodyBuffer.length, 4)
    const md5 = createHash('md5').update(meta).update(headerBuffer).update(bodyBuffer).digest('hex')
    parts.push(meta, headerBuffer, bodyBuffer, Buffer.from(md5, 'latin1'))
  }

  parts.push(Buffer.from(header, 'latin1'))
  return Buffer.concat(parts)
}
