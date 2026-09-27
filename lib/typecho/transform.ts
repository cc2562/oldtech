import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import type { PostCategory } from '../posts'
import type { TypechoRecord } from './dat'

/** Typecho marks Markdown-authored posts with this prefix in `text`. */
const MARKDOWN_MARKER = '<!--markdown-->'
/** Gutenberg block delimiters and WordPress excerpt breaks. */
const BLOCK_COMMENT = /<!--\s*\/?wp:[\s\S]*?-->/g
const MORE_COMMENT = /<!--more([\s\S]*?)-->/g
const HTML_TAG = /<[a-z][^>]*>/i
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type BodyFormat = 'markdown' | 'html'

export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, '\n')
}

/** Markdown marker first, then "does it actually contain HTML tags". */
export function detectBodyFormat(text: string): BodyFormat {
  const trimmed = normalizeNewlines(text).trimStart()
  if (trimmed.startsWith(MARKDOWN_MARKER)) return 'markdown'
  return HTML_TAG.test(trimmed) ? 'html' : 'markdown'
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  })
  service.use(gfm)
  // Raw HTML is escaped by the front-end renderer, so embeds are dropped rather
  // than stored as literal markup the reader would see as text.
  service.remove(['iframe', 'script', 'style'])
  // Images with captions become an image plus an italic caption line.
  service.addRule('captionedFigure', {
    filter: (node) => node.nodeName === 'FIGURE',
    replacement: (_content, node) => {
      const image = (node as HTMLElement).querySelector('img')
      const caption = (node as HTMLElement).querySelector('figcaption')?.textContent?.trim()
      const src = image?.getAttribute('src')
      if (!src) return caption ? `\n\n*${caption}*\n\n` : ''
      const alt = image?.getAttribute('alt') ?? ''
      return `\n\n![${alt}](${src})\n\n${caption ? `*${caption}*\n\n` : ''}`
    },
  })
  // Drop wrapper divs (e.g. plugin output) but keep their text content.
  service.addRule('passthroughDiv', {
    filter: ['div', 'span', 'section'],
    replacement: (content) => content,
  })
  return service
}

const turndown = createTurndown()

function preprocessHtml(html: string): string {
  return normalizeNewlines(html)
    .replace(BLOCK_COMMENT, '')
    .replace(MORE_COMMENT, '')
    .replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, '')
}

/** Converts a Typecho HTML body into Markdown. */
export function htmlToMarkdown(html: string): string {
  return cleanupMarkdown(turndown.turndown(preprocessHtml(html)))
}

/** Fenced code blocks (odd indices after splitting) are never rewritten. */
const CODE_FENCE = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g

function mapOutsideCodeFences(markdown: string, transform: (segment: string) => string): string {
  return markdown
    .split(CODE_FENCE)
    .map((segment, index) => (index % 2 === 1 ? segment : transform(segment)))
    .join('')
}

/**
 * Markdown bodies may still embed raw HTML (Typecho allowed it, our renderer
 * escapes it). Only inline media/link tags are rewritten here — other tags are
 * unwrapped but their text is kept.
 */
export function unwrapInlineHtml(markdown: string): string {
  return mapOutsideCodeFences(markdown, (segment) =>
    segment
      // Embeds and scripts cannot render in a Markdown body: drop them entirely.
      .replace(/<(script|style|iframe)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<iframe\b[^>]*\/?>/gi, '')
      // Block markup with a faithful Markdown equivalent is converted properly
      // instead of being unwrapped (tables keep their structure via GFM).
      .replace(/<figure\b[\s\S]*?<\/figure>/gi, (block: string) => `\n\n${turndown.turndown(block).trim()}\n\n`)
      .replace(/<table\b[\s\S]*?<\/table>/gi, (block: string) => `\n\n${turndown.turndown(block).trim()}\n\n`)
      .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_match, code: string) => `\n\n\`\`\`\n${code.replace(/\n$/, '')}\n\`\`\`\n\n`)
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_match, code: string) => `\n\n\`\`\`\n${code.replace(/\n$/, '')}\n\`\`\`\n\n`)
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
      .replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, '![$2]($1)')
      .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![$1]($2)')
      .replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, '![]($1)')
      .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
      .replace(/<br\s*\/?>/gi, '\n')
      // Inline markup that has a Markdown equivalent.
      .replace(/<(?:s|del|strike)\b[^>]*>([\s\S]*?)<\/(?:s|del|strike)>/gi, '~~$1~~')
      .replace(/<\/?(?:div|span|section|figure|figcaption|pre|code|p|h[1-6]|blockquote|ul|ol|li|strong|em|b|i|u|ins|sub|sup|mark|small|kbd|abbr|time|nav|header|footer|aside|article|main|details|summary|dl|dt|dd)[^>]*>/gi, ''),
  )
}

/** Counts leftover HTML tags in the parts that will actually be rendered. */
export function countHtmlTagsOutsideCode(markdown: string): number {
  let count = 0
  for (const [index, segment] of markdown.split(CODE_FENCE).entries()) {
    if (index % 2 === 1) continue
    count += segment.match(/<[a-z][^>]*>/gi)?.length ?? 0
  }
  return count
}

export function cleanupMarkdown(markdown: string): string {
  return normalizeNewlines(markdown)
    .replace(BLOCK_COMMENT, '')
    .replace(MORE_COMMENT, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Rewrites root-relative URLs (Typecho uploads) to the old site's origin. */
export function absolutizeUrls(markdown: string, oldSite: string): string {
  const base = oldSite.replace(/\/+$/, '')
  return mapOutsideCodeFences(markdown, (segment) =>
    segment
      .replace(/\]\((\/[^)\s]+)\)/g, (_match, path: string) => `](${base}${path})`)
      .replace(/(src|href)=(["'])\/(?!\/)/g, `$1=$2${base}/`),
  )
}

export function stripMarkdownToText(markdown: string): string {
  return markdown
    .replace(CODE_FENCE, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[>*_~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Comment bodies are plain text in our model: drop tags and entities. */
export function commentTextToPlainText(html: string): string {
  const text = normalizeNewlines(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}

export function truncate(value: string, max: number): string {
  const characters = Array.from(value)
  return characters.length <= max ? value : `${characters.slice(0, max - 1).join('')}…`
}

/** `contents.text` → the Markdown body stored in our `bodyMarkdown` field. */
export function bodyToMarkdown(text: string, oldSite: string): string {
  const format = detectBodyFormat(text)
  const markdown =
    format === 'markdown'
      ? cleanupMarkdown(unwrapInlineHtml(normalizeNewlines(text).replace(MARKDOWN_MARKER, '')))
      : htmlToMarkdown(text)
  return absolutizeUrls(markdown, oldSite)
}

/** Keeps a Typecho slug only when it satisfies our slug rule. */
export function normalizeSlug(slug: string | null): string | undefined {
  const value = (slug ?? '').trim().toLowerCase()
  return SLUG_PATTERN.test(value) ? value : undefined
}

/** Old cid → display issue number, keeping a traceable link to the old site. */
export function issueFromCid(cid: string): string {
  return String(cid).padStart(3, '0')
}

type FieldMap = Map<string, string>

/** `fields` records of type str, grouped as cid → field name → value. */
export function fieldsByCid(fields: TypechoRecord[]): Map<string, FieldMap> {
  const result = new Map<string, FieldMap>()
  for (const field of fields) {
    const cid = field.cid
    const name = field.name
    if (!cid || !name) continue
    const value = field.str_value ?? field.int_value ?? field.float_value ?? ''
    const bucket = result.get(cid) ?? new Map<string, string>()
    bucket.set(name, value)
    result.set(cid, bucket)
  }
  return result
}

export function featuredImageByCid(fields: TypechoRecord[]): Map<string, string> {
  const result = new Map<string, string>()
  for (const [cid, values] of fieldsByCid(fields)) {
    const url = (values.get('FeaturedImage') ?? '').trim()
    if (url) result.set(cid, url)
  }
  return result
}

export function aiSummaryByCid(fields: TypechoRecord[]): Map<string, string> {
  const result = new Map<string, string>()
  for (const [cid, values] of fieldsByCid(fields)) {
    const summary = (values.get('AISummary') ?? '').trim()
    if (summary) result.set(cid, summary)
  }
  return result
}

/**
 * cid → category, resolved through Typecho's relationships + metas tables and
 * mapped onto our own channels. Unknown categories fall back to `fallback`.
 */
export function categoryByCid(
  metas: TypechoRecord[],
  relationships: TypechoRecord[],
  mapping: Record<string, PostCategory>,
  fallback: PostCategory,
): Map<string, PostCategory> {
  const categoryNameByMid = new Map<string, string>()
  for (const meta of metas) {
    if (meta.type === 'category' && meta.mid && meta.name) categoryNameByMid.set(meta.mid, meta.name)
  }

  const result = new Map<string, PostCategory>()
  for (const relation of relationships) {
    const { cid, mid } = relation
    if (!cid || !mid || result.has(cid)) continue
    const name = categoryNameByMid.get(mid)
    if (!name) continue
    result.set(cid, mapping[name] ?? fallback)
  }
  return result
}

/** Unix seconds (Typecho) → ISO string. */
export function timestampToIso(seconds: string | null): string | undefined {
  if (!seconds) return undefined
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return undefined
  return new Date(value * 1000).toISOString()
}

/** Guesses the old site origin from the backup file name, e.g. 20260928_world.ccrice.com_x.dat */
export function guessOldSite(fileName: string): string | undefined {
  const match = fileName.match(/^\d{8}_([^_]+)_/)
  return match ? `https://${match[1]}` : undefined
}
