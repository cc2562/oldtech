import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { getPayload, type Where } from 'payload'
import { encodeBackup, readBackup, type TypechoRecord } from '../lib/typecho/dat.js'
import {
  aiSummaryByCid, bodyToMarkdown, categoryByCid, commentTextToPlainText, countHtmlTagsOutsideCode,
  detectBodyFormat, featuredImageByCid, guessOldSite, issueFromCid, normalizeSlug,
  timestampToIso, truncate,
} from '../lib/typecho/transform.js'
import type { PostCategory } from '../lib/posts.js'
import type { Post } from '../payload-types.js'

/** Required fields of a post, plus any other column we fill in. */
type PostData = Required<Pick<Post, 'title' | 'slug' | 'category' | 'issue' | 'readingMinutes'>> & Partial<Post>
/** Narrow helper: keeps the required keys checked without excess-property noise. */
const asPostData = (data: Partial<Post>): PostData => data as PostData

/**
 * Typecho 备份导入。
 *
 *   npm run import:typecho -- --file <备份.dat> --inspect    只看结构，不写库
 *   npm run import:typecho -- --file <备份.dat> --dry-run     只做转换与预览，不写库
 *   npm run import:typecho -- --file <备份.dat>             正式导入
 *   npm run import:typecho -- --selftest                    用合成备份自检解析与转换
 *
 * 选项：--old-site <url>（相对图片补全）、--default-category <技术|思想|生活>、
 *       --map "技术=技术,分享=生活"、--limit <n>、--skip-images、--include-drafts=false
 */

const PUBLIC_CATEGORIES: PostCategory[] = ['技术', '思想', '生活']
const PAGE_CATEGORY: PostCategory = '页面'
const DEFAULT_CATEGORY_MAP: Record<string, PostCategory> = {
  技术: '技术',
  思想: '思想',
  分享: '生活',
  划水: '生活',
}
const COMMENT_MAX = 2000
const AUTHOR_MAX = 24
const EXCERPT_MAX = 400

type Args = {
  file?: string
  inspect: boolean
  dryRun: boolean
  selftest: boolean
  oldSite?: string
  defaultCategory: PostCategory
  mapping: Record<string, PostCategory>
  limit?: number
  /** Retry only these old cids (comma separated). */
  only: string[]
  skipImages: boolean
  includeDrafts: boolean
  skipComments: boolean
}

/** Payload errors carry per-field details in `data.errors`. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const details = (error as { data?: { errors?: { message?: string; path?: string }[] } }).data?.errors
  if (Array.isArray(details) && details.length) {
    return `${error.message}（${details.map((item) => `${item.path ?? '?'}: ${item.message ?? '?'}`).join('；')}）`
  }
  return error.message
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    inspect: false, dryRun: false, selftest: false, defaultCategory: '生活',
    mapping: { ...DEFAULT_CATEGORY_MAP }, only: [], skipImages: false, includeDrafts: true, skipComments: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    const next = argv[index + 1]
    if (token === '--file') { args.file = next; index += 1 }
    else if (token === '--inspect') args.inspect = true
    else if (token === '--dry-run') args.dryRun = true
    else if (token === '--selftest') args.selftest = true
    else if (token === '--old-site') { args.oldSite = next; index += 1 }
    else if (token === '--default-category') { args.defaultCategory = next as PostCategory; index += 1 }
    else if (token === '--map') {
      for (const pair of (next ?? '').split(',')) {
        const [from, to] = pair.split('=').map((part) => part.trim())
        if (from && (PUBLIC_CATEGORIES.includes(to as PostCategory) || to === PAGE_CATEGORY)) args.mapping[from] = to as PostCategory
      }
      index += 1
    }
    else if (token === '--limit') { args.limit = Number(next); index += 1 }
    else if (token === '--only') { args.only = (next ?? '').split(',').map((part) => part.trim()).filter(Boolean); index += 1 }
    else if (token === '--skip-images') args.skipImages = true
    else if (token === '--skip-comments') args.skipComments = true
    else if (token === '--include-drafts=false') args.includeDrafts = false
  }
  return args
}

type Candidate = {
  cid: string
  title: string
  slug?: string
  category: PostCategory
  issue: string
  publishedAt?: string
  createdAt?: string
  markdown: string
  format: 'markdown' | 'html'
  excerpt?: string
  coverUrl?: string
  isDraft: boolean
  kind: 'post' | 'page'
}

function buildCandidates(tables: Awaited<ReturnType<typeof readBackup>>['tables'], args: Args): {
  candidates: Candidate[]
  skipped: { label: string; reason: string }[]
} {
  const covers = featuredImageByCid(tables.fields)
  const summaries = aiSummaryByCid(tables.fields)
  const categories = categoryByCid(tables.metas, tables.relationships, args.mapping, args.defaultCategory)
  const candidates: Candidate[] = []
  const skipped: { label: string; reason: string }[] = []

  for (const content of tables.contents) {
    const cid = content.cid ?? ''
    const type = content.type ?? ''
    const status = content.status ?? ''
    const title = (content.title ?? '').trim() || `未命名内容 ${cid}`

    if (type === 'attachment') { skipped.push({ label: `#${cid} ${title}`, reason: '附件' }); continue }
    if (!['post', 'page', 'post_draft', 'page_draft'].includes(type)) {
      skipped.push({ label: `#${cid} ${title}`, reason: `未知类型 ${type}` }); continue
    }

    const isPage = type.startsWith('page')
    const published = status === 'publish' && !type.endsWith('_draft')
    if (!published && !args.includeDrafts) {
      skipped.push({ label: `#${cid} ${title}`, reason: `未发布（${status}）` }); continue
    }

    const rawText = content.text ?? ''
    const format = detectBodyFormat(rawText)
    const markdown = bodyToMarkdown(rawText, args.oldSite ?? '')
    const summary = summaries.get(cid)

    // Our posts require at least one body; empty drafts would be rejected.
    if (markdown.length === 0) {
      skipped.push({ label: `#${cid} ${title}`, reason: `正文为空（${status}）` })
      continue
    }

    candidates.push({
      cid,
      title,
      slug: normalizeSlug(content.slug),
      category: isPage ? PAGE_CATEGORY : categories.get(cid) ?? args.defaultCategory,
      issue: issueFromCid(cid),
      publishedAt: timestampToIso(content.created),
      createdAt: timestampToIso(content.created),
      markdown,
      format,
      excerpt: summary ? truncate(summary.replace(/\s+/g, ' ').trim(), EXCERPT_MAX) : undefined,
      coverUrl: covers.get(cid),
      isDraft: !published,
      kind: isPage ? 'page' : 'post',
    })
  }

  return { candidates, skipped }
}

type PayloadClient = Awaited<ReturnType<typeof getPayload>>

/**
 * Idempotency key. Slug is authoritative when the old site had one (Typecho
 * falls back to numeric slugs); otherwise the exact title is the best signal.
 * `issue` is NOT used here — the new site already has posts whose issue numbers
 * collide with old cids, and skipping real articles would be silent data loss.
 */
async function findExistingPost(payload: PayloadClient, item: Candidate) {
  const where: Where = item.slug ? { slug: { equals: item.slug } } : { title: { equals: item.title } }
  const found = await payload.find({ collection: 'posts', where, limit: 1, depth: 0, draft: true, overrideAccess: true })
  return found.docs[0]
}

/** Keeps the zero-padded cid as the issue unless it is already taken. */
async function allocateIssue(payload: PayloadClient, desired: string): Promise<{ issue: string; reassigned: boolean }> {
  const suffixes = ['b', 'c', 'd', 'e', 'f']
  for (let attempt = 0; attempt <= suffixes.length; attempt += 1) {
    const candidate = attempt === 0 ? desired : `${desired}${suffixes[attempt - 1]}`
    const taken = await payload.find({ collection: 'posts', where: { issue: { equals: candidate } }, limit: 1, depth: 0, draft: true, overrideAccess: true })
    if (!taken.docs.length) return { issue: candidate, reassigned: attempt > 0 }
  }
  return { issue: desired, reassigned: false }
}

async function downloadAsMedia(payload: Awaited<ReturnType<typeof getPayload>>, url: string, alt: string, cache: Map<string, number>) {
  const cached = cache.get(url)
  if (cached !== undefined) return cached
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0) throw new Error('下载到空文件')
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'cover')
  const mimetype = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  const media = await payload.create({
    collection: 'media',
    data: { alt: truncate(alt, 200) },
    file: { data: bytes, mimetype, name, size: bytes.length },
  })
  cache.set(url, media.id)
  return media.id
}

async function runSelfTest() {
  const sampleHtml = `<!-- wp:paragraph -->
<p>这一次出cos是因为之前和好朋友约好了五一节要去漫展一起玩才决定的，不过朋友临时有事情 所以最后变成了在社团的晚会上出cos</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p></p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">买衣服</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>上一次出的是山田凉，所以这一次打算试着出男角色 最后就确定了出绝区零里面的<strong>浅羽悠真</strong></p>
<!-- /wp:paragraph -->

<!-- wp:image {"id":980,"sizeSlug":"large"} -->
<figure class="wp-block-image size-large"><img src="https://world.ccrice.com/wp-content/uploads/2025/05/cos.avif" alt="" class="wp-image-980"/><figcaption class="wp-element-caption">浅羽悠真的角色立绘</figcaption></figure>
<!-- /wp:image -->`

  const markdownBody = `<!--markdown-->> 肉体的眼睛闭合之时，心灵的眼睛方能睁开。

你好呀~ 这里是 **CC米饭**，欢迎降落。

\`\`\`text
<img src="/usr/uploads/raw.png">
\`\`\`

<img src="/usr/uploads/inline.webp" alt="测试图">

| 频道 | 记录 |
| --- | --- |
| 技术 | 02 |`

  const backup = encodeBackup('0001', [
    { type: 1, fields: [
      ['cid', '1'], ['title', 'HTML 文章'], ['slug', 'html-post'], ['created', '1700000000'], ['modified', '1700000000'],
      ['text', sampleHtml], ['order', '0'], ['authorId', '1'], ['template', null], ['type', 'post'], ['status', 'publish'],
      ['password', null], ['commentsNum', '1'], ['allowComment', '1'], ['allowPing', '1'], ['allowFeed', '1'], ['parent', '0'],
    ] },
    { type: 1, fields: [
      ['cid', '2'], ['title', 'Markdown 文章'], ['slug', 'md-post'], ['created', '1700000100'], ['modified', '1700000100'],
      ['text', markdownBody], ['order', '0'], ['authorId', '1'], ['template', null], ['type', 'post'], ['status', 'publish'],
      ['password', null], ['commentsNum', '1'], ['allowComment', '1'], ['allowPing', '1'], ['allowFeed', '1'], ['parent', '0'],
    ] },
    { type: 6, fields: [
      ['cid', '1'], ['name', 'FeaturedImage'], ['type', 'str'],
      ['str_value', 'https://world.ccrice.com/usr/uploads/cover.webp'], ['int_value', '0'], ['float_value', '0'],
    ] },
    { type: 2, fields: [
      ['coid', '1'], ['cid', '2'], ['created', '1700000200'], ['author', '米饭'], ['authorId', '0'], ['ownerId', '1'],
      ['mail', 'a@example.com'], ['url', null], ['ip', null], ['agent', null], ['text', '顶楼评论'], ['type', 'comment'],
      ['status', 'approved'], ['parent', '0'],
    ] },
    { type: 2, fields: [
      ['coid', '2'], ['cid', '2'], ['created', '1700000300'], ['author', '朋友'], ['authorId', '0'], ['ownerId', '1'],
      ['mail', 'b@example.com'], ['url', null], ['ip', null], ['agent', null], ['text', '回复内容'], ['type', 'comment'],
      ['status', 'approved'], ['parent', '1'],
    ] },
  ])

  const parsed = (await import('../lib/typecho/dat.js')).parseBackup(backup)
  const { candidates } = buildCandidates(parsed.tables, { ...parseArgs([]), oldSite: 'https://world.ccrice.com' })
  const htmlPost = candidates.find((item) => item.format === 'html')?.markdown ?? ''
  const mdPost = candidates.find((item) => item.format === 'markdown')?.markdown ?? ''
  const checks: [string, boolean][] = [
    ['解析出 2 篇文章', candidates.length === 2],
    ['表计数正确', parsed.tables.contents.length === 2 && parsed.tables.comments.length === 2],
    ['md5 校验全部通过', parsed.checksumFailures === 0],
    ['HTML 文章被识别为 html', htmlPost.length > 0],
    ['Gutenberg 注释已清除', htmlPost.length > 0 && !htmlPost.includes('wp:')],
    ['空段落已清除', htmlPost.length > 0 && !/<p>\s*<\/p>/.test(htmlPost)],
    ['figure 转成图片 + 斜体说明', htmlPost.includes('*浅羽悠真的角色立绘*') && htmlPost.includes('(https://world.ccrice.com/wp-content/uploads/2025/05/cos.avif)')],
    ['Markdown 文章保留 markdown', mdPost.length > 0],
    ['markdown 标记已剥离', mdPost.length > 0 && !mdPost.includes('<!--markdown-->')],
    ['代码块内 HTML 未被改写', mdPost.includes('<img src="/usr/uploads/raw.png">')],
    ['正文内联图片已转 Markdown', mdPost.includes('![测试图](')],
    ['相对图片补全为绝对地址', mdPost.includes('https://world.ccrice.com/usr/uploads/inline.webp')],
    ['Markdown 表格未被破坏', mdPost.includes('| 技术 | 02 |')],
    ['封面字段被读取', candidates.some((item) => item.coverUrl?.endsWith('cover.webp'))],
    ['评论父级关系可映射', parsed.tables.comments[1]?.parent === '1'],
  ]

  let failed = 0
  for (const [label, ok] of checks) {
    console.log(`${ok ? '  ✓' : '  ✗'} ${label}`)
    if (!ok) failed += 1
  }
  if (htmlPost) console.log('\n--- HTML 转换结果预览 ---\n' + htmlPost.slice(0, 400))
  console.log(`\n自检：${checks.length - failed}/${checks.length} 通过`)
  if (failed > 0) process.exitCode = 1
}

/** Minimal .env loader: this script runs via tsx, outside Next's own loading. */
function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!match || process.env[match[1]] !== undefined) continue
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = value
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  // Loaded before the config module so MEDIA_DIR / DATABASE_URL are in place.
  loadLocalEnv()

  if (args.selftest) {
    await runSelfTest()
    return
  }

  if (!args.file) {
    console.error('请用 --file <备份.dat> 指定 Typecho 备份文件（或使用 --selftest）。')
    process.exitCode = 1
    return
  }

  const fileName = path.basename(args.file)
  const oldSite = args.oldSite ?? guessOldSite(fileName)
  if (!oldSite) {
    console.error('无法从文件名推断旧站地址，请用 --old-site https://example.com 指定。')
    process.exitCode = 1
    return
  }

  const parsed = await readBackup(args.file)
  const { candidates, skipped } = buildCandidates(parsed.tables, { ...args, oldSite })
  const selected = args.only.length ? candidates.filter((item) => args.only.includes(item.cid)) : candidates
  const scoped = args.limit ? selected.slice(0, args.limit) : selected
  const formatCount = scoped.reduce((total, item) => total + (item.format === 'html' ? 1 : 0), 0)

  console.log(`备份版本 ${parsed.version}｜记录：` + Object.entries(parsed.tables).map(([name, rows]) => `${name} ${rows.length}`).join('、'))
  if (parsed.unknownTypes.length) console.log(`未识别的记录类型（已跳过）：${parsed.unknownTypes.join(', ')}`)
  if (parsed.checksumFailures) console.log(`⚠ md5 校验失败 ${parsed.checksumFailures} 条`)
  console.log(`旧站地址：${oldSite}`)
  console.log(`待导入：${scoped.length} 条（其中 HTML 转换 ${formatCount} 条、草稿 ${scoped.filter((item) => item.isDraft).length} 条、页面 ${scoped.filter((item) => item.kind === 'page').length} 条）`)
  console.log(`跳过：${skipped.length} 条` + (skipped.length ? `（${skipped.slice(0, 5).map((item) => item.reason).join('、')}…）` : ''))

  if (args.inspect) {
    console.log('\n--- 前 5 条内容 ---')
    for (const item of scoped.slice(0, 5)) {
      console.log(`${item.issue}｜${item.title}｜${item.category}｜${item.format}｜${item.isDraft ? '草稿' : '发布'}｜封面 ${item.coverUrl ?? '无'}｜正文 ${item.markdown.length} 字`)
    }
    const categories = new Map<string, number>()
    for (const item of scoped) categories.set(item.category, (categories.get(item.category) ?? 0) + 1)
    console.log('\n分类分布：' + [...categories].map(([name, count]) => `${name} ${count}`).join('、'))
    const commentCount = parsed.tables.comments.filter((row) => row.status === 'approved').length
    console.log(`评论：approved ${commentCount} 条（未审核 ${parsed.tables.comments.length - commentCount} 条将跳过）`)
    return
  }

  if (args.dryRun) {
    console.log('\n--- 转换预览 ---')
    for (const item of scoped.slice(0, 5)) {
      console.log(`\n### ${item.issue}｜${item.title}（${item.category}｜${item.format}｜${item.isDraft ? '草稿' : '发布'}）`)
      console.log(`slug: ${item.slug ?? '(自动生成)'}｜发布时间 ${item.publishedAt ?? '未知'}｜封面 ${item.coverUrl ?? '无'}`)
      console.log(truncate(item.markdown.replace(/\n{2,}/g, '\n'), 320))
    }

    const withTags = scoped.filter((item) => countHtmlTagsOutsideCode(item.markdown) > 0)
    const imageCount = scoped.reduce((total, item) => total + (item.markdown.match(/!\[[^\]]*\]\(/g)?.length ?? 0), 0)
    console.log('\n--- 转换统计 ---')
    console.log(`正文长度：最短 ${Math.min(...scoped.map((item) => item.markdown.length))} 字、最长 ${Math.max(...scoped.map((item) => item.markdown.length))} 字`)
    const emptySkipped = skipped.filter((item) => item.reason.startsWith('正文为空')).length
    console.log(`已跳过空正文 ${emptySkipped} 条｜正文仍残留 HTML 标签 ${withTags.length} 条｜图片引用 ${imageCount} 处｜封面 ${scoped.filter((item) => item.coverUrl).length} 条｜使用 AISummary 摘要 ${scoped.filter((item) => item.excerpt).length} 条`)
    if (withTags.length) {
      console.log('残留标签示例（仅取代码块之外的片段）：')
      for (const item of withTags.slice(0, 5)) {
        const parts = item.markdown.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
        let snippet = ''
        for (let index = 0; index < parts.length && !snippet; index += 2) {
          snippet = parts[index].match(/.{0,45}<[a-z][^>]*>.{0,45}/i)?.[0].replace(/\n/g, ' ') ?? ''
        }
        console.log(`  - ${item.issue} ${item.title}：${snippet}`)
      }
    }
    console.log(`\n（以上为前 5 条预览，共 ${scoped.length} 条将导入；未写入数据库）`)
    return
  }

  const { default: config } = await import('../payload.config.js')
  const payload = await getPayload({ config })
  const coverCache = new Map<string, number>()
  const catalog = new Map<string, number>() // old cid → new post id
  let created = 0
  let skippedExisting = 0
  let issueReassigned = 0
  let coverFailures = 0
  const failures: string[] = []

  for (const item of scoped) {
    const existing = await findExistingPost(payload, item)
    if (existing) {
      catalog.set(item.cid, existing.id)
      skippedExisting += 1
      continue
    }

    const { issue, reassigned } = await allocateIssue(payload, item.issue)
    if (reassigned) {
      issueReassigned += 1
      console.log(`  期号 ${item.issue} 已被占用，改用 ${issue}（${item.title}）`)
    }

    let coverId: number | undefined
    if (item.coverUrl && !args.skipImages) {
      const coverData = await downloadAsMedia(payload, item.coverUrl, item.title, coverCache).catch((error: unknown) => {
        coverFailures += 1
        failures.push(`封面 ${item.issue} ${item.coverUrl}：${describeError(error)}`)
        return undefined
      })
      coverId = coverData
    }

    const baseData = {
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      category: item.category,
      issue,
      featured: false,
      publishedAt: item.publishedAt,
      bodyMarkdown: item.markdown,
      // Markdown replaces the rich-text body; Payload's create type wants every
      // non-system key present, so the unused ones are set explicitly.
      body: null,
      pullQuote: null,
      // Placeholder only: the Posts beforeValidate hook always recomputes it
      // from the body (the field is required by the model).
      readingMinutes: 1,
      ...(coverId ? { cover: coverId } : {}),
      ...(item.createdAt ? { createdAt: item.createdAt } : {}),
    }

    // Two explicit calls so the draft/published overloads stay type-checked.
    const createPost = () => item.isDraft
      ? payload.create({ collection: 'posts', draft: true, data: asPostData({ ...baseData, _status: 'draft' }) })
      : payload.create({ collection: 'posts', data: asPostData({ ...baseData, _status: 'published' }) })

    const post = await createPost().catch((error: unknown) => {
      failures.push(`文章 ${item.issue} ${item.title}：${describeError(error)}`)
      return undefined
    })
    if (!post) continue

    catalog.set(item.cid, post.id)
    created += 1
    if (created % 20 === 0) console.log(`…已导入 ${created} 篇`)
  }

  // Comments: only approved ones, parents resolved in a second pass. Writes are
  // idempotent (matched on post + author + text) so the import can be re-run.
  const approvedComments = parsed.tables.comments.filter((row) => row.status === 'approved')
  const commentIdByCoid = new Map<string, number>()
  let commentsCreated = 0
  let commentsReused = 0
  let commentsSkipped = 0
  let orphanReplies = 0

  const commentPayload = (row: TypechoRecord, postId: number, parent?: number) => {
    const author = truncate((row.author ?? '').trim() || '匿名', AUTHOR_MAX)
    const text = truncate(commentTextToPlainText(row.text ?? ''), COMMENT_MAX) || '（原评论内容为空）'
    return {
      author,
      text,
      data: {
        post: postId,
        ...(parent ? { parent } : {}),
        author,
        text,
        status: 'approved' as const,
        ...(row.mail ? { email: row.mail } : {}),
        ...(row.url && /^https?:\/\//i.test(row.url) ? { site: row.url } : {}),
        ...(row.created ? { createdAt: timestampToIso(row.created) } : {}),
      },
    }
  }

  const importComment = async (row: TypechoRecord, postId: number, parent?: number): Promise<number | undefined> => {
    const { author, text, data } = commentPayload(row, postId, parent)
    const existing = await payload.find({
      collection: 'comments',
      where: { and: [{ post: { equals: postId } }, { author: { equals: author } }, { text: { equals: text } }] },
      limit: 1, depth: 0, overrideAccess: true,
    })
    if (existing.docs.length) {
      commentsReused += 1
      return existing.docs[0].id
    }
    const comment = await payload.create({ collection: 'comments', data }).catch((error: unknown) => {
      failures.push(`评论 #${row.coid ?? '?'}：${describeError(error)}`)
      return undefined
    })
    if (!comment) return undefined
    commentsCreated += 1
    return comment.id
  }

  if (!args.skipComments) {
    // Pass 1: comments whose parent is already known (top level first).
    const deferred: { row: TypechoRecord; postId: number }[] = []
    for (const row of approvedComments) {
      const postId = row.cid ? catalog.get(row.cid) : undefined
      if (!postId) { commentsSkipped += 1; continue }
      const parent = row.parent && row.parent !== '0' ? commentIdByCoid.get(row.parent) : undefined
      if (row.parent && row.parent !== '0' && parent === undefined) {
        deferred.push({ row, postId })
        continue
      }
      const id = await importComment(row, postId, parent)
      if (id !== undefined) commentIdByCoid.set(row.coid ?? '', id)
    }

    // Pass 2: replies (or replies whose parent was never imported).
    for (const entry of deferred) {
      const parent = entry.row.parent ? commentIdByCoid.get(entry.row.parent) : undefined
      if (!parent) orphanReplies += 1
      const id = await importComment(entry.row, entry.postId, parent)
      if (id !== undefined) commentIdByCoid.set(entry.row.coid ?? '', id)
    }
  }

  console.log(`\n导入完成：文章新建 ${created} 篇、已存在跳过 ${skippedExisting} 篇${issueReassigned ? `（其中 ${issueReassigned} 篇因期号冲突改用带后缀的新期号）` : ''}；评论新建 ${commentsCreated} 条、已存在复用 ${commentsReused} 条、无对应文章跳过 ${commentsSkipped} 条${orphanReplies ? `、父评论缺失降级为顶层 ${orphanReplies} 条` : ''}`)
  if (coverFailures) console.log(`封面下载失败 ${coverFailures} 个（文章仍已导入，可在后台手动补）`)
  if (failures.length) {
    console.log(`\n失败明细（前 10 条）：`)
    for (const line of failures.slice(0, 10)) console.log(`  - ${line}`)
  }
  console.log('\n提示：草稿文章在后台「文章」中状态为未公开；「页面」分类不会出现在首页与档案列表。')
}

// `payload run` executes this file directly.
main().then(() => process.exit(0)).catch((error: unknown) => {
  console.error('导入失败：', error instanceof Error ? error.message : error)
  process.exit(1)
})
