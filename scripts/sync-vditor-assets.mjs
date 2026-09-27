// Copies Vditor's runtime assets (highlight.js styles, icons, lute engine, …)
// into public/vditor so the admin editor never reaches an external CDN — this
// blog is self-hosted and must keep working offline/intranet.
//
// Vditor resolves those files as `${cdn}/dist/...`, so `cdn: '/vditor'` maps to
// `public/vditor/dist`. Runs before `npm run dev` / `npm run build`; the target
// is git-ignored because it is a generated copy of node_modules content.
//
// The sync is incremental and never deletes: a file is written only when its
// bytes differ, so repeated runs are no-ops and no bulk delete/overwrite pass
// happens (also keeps dev startup instant). A version marker skips the whole
// walk when the installed Vditor version has not changed.
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const packageFile = path.join(root, 'node_modules', 'vditor', 'package.json')
const source = path.join(root, 'node_modules', 'vditor', 'dist')
const targetRoot = path.join(root, 'public', 'vditor')
const target = path.join(targetRoot, 'dist')
const marker = path.join(targetRoot, 'version.txt')

async function readOrNull(file) {
  try {
    return await readFile(file)
  } catch {
    return null
  }
}

async function exists(targetPath) {
  try {
    await stat(targetPath)
    return true
  } catch {
    return false
  }
}

/** Recursive copy that only writes files whose content differs. */
async function syncDirectory(from, to, counters) {
  await mkdir(to, { recursive: true })
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name)
    const targetPath = path.join(to, entry.name)
    if (entry.isDirectory()) {
      await syncDirectory(sourcePath, targetPath, counters)
      continue
    }
    const data = await readFile(sourcePath)
    const current = await readOrNull(targetPath)
    if (current && current.equals(data)) {
      counters.skipped += 1
      continue
    }
    await writeFile(targetPath, data)
    counters.written += 1
  }
}

const installed = await readOrNull(packageFile)
if (!installed) {
  console.error('[vditor] 未找到 node_modules/vditor，请先执行 npm install')
  process.exit(1)
}
const version = JSON.parse(installed.toString('utf8')).version

if ((await readOrNull(marker))?.toString('utf8') === version && (await exists(target))) {
  console.log(`[vditor] 资源已是最新（v${version}），跳过同步`)
  process.exit(0)
}

const counters = { written: 0, skipped: 0 }
await syncDirectory(source, target, counters)
await writeFile(marker, version)
console.log(
  `[vditor] 编辑器资源已同步到 ${path.relative(root, target)}（v${version}，写入 ${counters.written} 个文件，跳过 ${counters.skipped} 个）`,
)
