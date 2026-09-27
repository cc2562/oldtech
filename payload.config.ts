import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig, ValidationError, type CollectionConfig, type GlobalConfig, type PayloadRequest } from 'payload'
import sharp from 'sharp'
import { randomSlug, timestampedSlug } from './lib/slug'

const here = path.dirname(fileURLToPath(import.meta.url))
const adminOnly = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

const optionalWebURL = (value: unknown) => {
  if (value === undefined || value === null || value === '') return true
  try { return ['http:', 'https:'].includes(new URL(String(value)).protocol) || '只允许 HTTP(S) 地址' }
  catch { return '请输入有效网址' }
}

function richTextToPlainText(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  if (Array.isArray(value)) return value.map(richTextToPlainText).filter(Boolean).join(' ')

  const node = value as Record<string, unknown>
  const ownText = typeof node.text === 'string' ? node.text : ''
  const childText = richTextToPlainText(node.children)
  const rootText = richTextToPlainText(node.root)
  return [ownText, childText, rootText].filter(Boolean).join(' ')
}

function normalizeArticleText(value: unknown) {
  return richTextToPlainText(value).replace(/\s+/g, ' ').trim()
}

// Strips common Markdown syntax so reading time and auto excerpts work for
// Markdown bodies the same way they do for Lexical rich text.
function markdownToPlainText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[|*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Picks a slug nobody has used yet, so leaving the field empty stays safe even
 * though the column is unique. Access is overridden because drafts are not
 * readable by the public and would otherwise be invisible to this check.
 */
async function unusedSlug(req: PayloadRequest): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomSlug()
    const existing = await req.payload.find({
      collection: 'posts',
      where: { slug: { equals: candidate } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs.length === 0) return candidate
  }
  return timestampedSlug()
}

function excerptFromText(text: string) {
  const characters = Array.from(text)
  return `${characters.slice(0, 80).join('')}${characters.length > 80 ? '…' : ''}`
}

function readingMinutesFromText(text: string) {
  const cjkCharacters = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length
  const latinWords = (text.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ').match(/[\p{L}\p{N}]+/gu) || []).length
  return Math.max(1, Math.ceil(cjkCharacters / 300 + latinWords / 200))
}

const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [],
}

const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true, create: adminOnly, update: adminOnly, delete: adminOnly },
  upload: {
    staticDir: process.env.MEDIA_DIR || path.join(here, 'media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [{ name: 'card', width: 720 }, { name: 'hero', width: 1440 }],
  },
  fields: [{ name: 'alt', type: 'text', required: true, maxLength: 200 }],
}

const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'category', '_status', 'updatedAt'],
    preview: (doc) => {
      if (!doc.slug || !process.env.PREVIEW_SECRET) return null
      return `/preview?${new URLSearchParams({ slug: String(doc.slug), secret: process.env.PREVIEW_SECRET })}`
    },
  },
  versions: { drafts: true },
  access: {
    read: ({ req }) => req.user ? true : { _status: { equals: 'published' } },
    create: adminOnly, update: adminOnly, delete: adminOnly,
  },
  hooks: {
    beforeValidate: [async ({ data, originalDoc, req }) => {
      if (!data) return data
      // Auto slug: an empty field (create or cleared on update) is filled with a
      // generated id here, which runs before the `required`/`unique` checks.
      const incomingSlug = typeof data.slug === 'string' ? data.slug.trim() : data.slug
      data.slug = incomingSlug || await unusedSlug(req)
      const markdown = data.bodyMarkdown ?? originalDoc?.bodyMarkdown
      const body = data.body ?? originalDoc?.body
      // Markdown takes priority for derived values when both are present,
      // matching the front-end rendering priority.
      const articleText = markdownToPlainText(markdown) || normalizeArticleText(body)
      if (!articleText) {
        throw new ValidationError({
          collection: 'posts',
          errors: [{ path: 'bodyMarkdown', message: '请填写富文本正文或 Markdown 正文（至少一种）。' }],
        })
      }
      data.readingMinutes = readingMinutesFromText(articleText)
      const currentExcerpt = data.excerpt ?? originalDoc?.excerpt
      if (!String(currentExcerpt || '').trim()) data.excerpt = excerptFromText(articleText)
      return data
    }],
    beforeChange: [({ data }) => {
      if (data._status === 'published' && !data.publishedAt) data.publishedAt = new Date().toISOString()
      return data
    }],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 160 },
    { name: 'slug', type: 'text', required: true, unique: true, index: true, admin: { description: '仅小写英文字母、数字和连字符。留空保存时会自动生成一串 ID，之后可随时改成更好记的地址。', placeholder: '留空自动生成 ID' }, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? true : '使用小写英文字母、数字和连字符' },
    { name: 'excerpt', type: 'textarea', maxLength: 400, admin: { description: '可选；留空时保存文章会自动截取正文前 80 字。' } },
    { name: 'category', type: 'select', required: true, options: ['技术', '设计', '生活'] },
    { name: 'issue', type: 'text', required: true, unique: true, maxLength: 12 },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    { name: 'publishedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'readingMinutes', type: 'number', required: true, min: 1, max: 999, admin: { readOnly: true, description: '根据正文长度自动计算。' } },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText' },
    { name: 'bodyMarkdown', label: 'Markdown 正文', type: 'textarea', admin: {
      description: '与富文本正文二选一；填写后前台优先渲染 Markdown（支持 GFM 表格、任务列表、删除线与代码高亮，图片写法 ![说明](图片地址)）。',
      components: { Field: '@/components/admin/MarkdownEditor#MarkdownEditorField' },
    } },
    { name: 'pullQuote', type: 'textarea' },
  ],
}

const FriendLinks: CollectionConfig = {
  slug: 'friend-links',
  labels: { singular: '友情链接', plural: '友情链接' },
  admin: { useAsTitle: 'name', group: '内容管理' },
  access: {
    read: ({ req }) => req.user ? true : { status: { equals: 'published' } },
    create: adminOnly, update: adminOnly, delete: adminOnly,
  },
  fields: [
    { name: 'name', label: '站点名称', type: 'text', required: true },
    { name: 'description', label: '站点描述', type: 'textarea', required: true },
    { name: 'url', label: '站点链接', type: 'text', required: true, validate: optionalWebURL },
    { name: 'icon', label: '图标图片 URL', type: 'text', maxLength: 1000, admin: { description: '可选，支持外部 HTTP(S) 图片；留空、旧版文字图标或加载失败时显示站点名称的第一个字。' } },
    { name: 'issue', label: '编号', type: 'text', required: true },
    { name: 'status', label: '公开状态', type: 'select', required: true, defaultValue: 'draft', options: [{ label: '草稿', value: 'draft' }, { label: '公开', value: 'published' }] },
  ],
}

const Comments: CollectionConfig = {
  slug: 'comments',
  labels: { singular: '评论', plural: '评论' },
  admin: { useAsTitle: 'author', group: '内容管理', defaultColumns: ['author', 'post', 'parent', 'status', 'createdAt'] },
  access: {
    read: ({ req }) => req.user ? true : { status: { equals: 'approved' } },
    create: adminOnly, update: adminOnly, delete: adminOnly,
  },
  fields: [
    { name: 'post', type: 'relationship', relationTo: 'posts', required: true, index: true },
    { name: 'parent', label: '回复对象', type: 'relationship', relationTo: 'comments', index: true, admin: { description: '为空时是顶层评论；访客回复时自动关联。' } },
    { name: 'author', type: 'text', required: true, maxLength: 24 },
    { name: 'text', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'email', type: 'email', access: { read: adminOnly } },
    { name: 'site', type: 'text' },
    { name: 'ipHash', type: 'text', admin: { hidden: true }, access: { read: adminOnly, create: () => false, update: () => false } },
    { name: 'status', type: 'select', required: true, defaultValue: 'pending', options: ['pending', 'approved', 'rejected'], access: { create: adminOnly, update: adminOnly } },
  ],
}

const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: '站点资料与站长档案',
  admin: { group: '站点管理' },
  access: { read: () => true, update: adminOnly },
  fields: [
    { type: 'tabs', tabs: [
      { label: '站点资料', fields: [
        { name: 'name', label: '站点名称', type: 'text', required: true, defaultValue: 'NEON / NOTES' },
        { name: 'description', label: '站点描述', type: 'textarea', required: true, defaultValue: '关于技术、设计与日常生活的个人记录。' },
      ] },
      { label: '站长档案', fields: [
        { name: 'author', label: '站长名称', type: 'text', required: true, defaultValue: '站长' },
        { name: 'bio', label: '站长简介', type: 'textarea', admin: { description: '显示在友情链接页的“站长档案”中；留空时使用站点描述。' } },
        { name: 'avatar', label: '站长头像', type: 'upload', relationTo: 'media', admin: { description: '从媒体库选择或上传；留空时显示站长名称的第一个字。' } },
        { name: 'socialLinks', label: '社交链接', type: 'array', labels: { singular: '社交链接', plural: '社交链接' }, fields: [
          { name: 'label', label: '平台名称', type: 'text', required: true },
          { name: 'handle', label: '账号或说明', type: 'text', required: true },
          { name: 'url', label: '链接', type: 'text', required: true, validate: (value: unknown) => {
            try { return ['http:', 'https:', 'mailto:'].includes(new URL(String(value)).protocol) || '只允许 HTTP(S) 或邮件地址' }
            catch { return '请输入有效链接' }
          } },
        ] },
      ] },
      { label: '评论设置', fields: [
        { name: 'requireCommentApproval', label: '新评论需要审核', type: 'checkbox', defaultValue: true },
      ] },
      { label: '列表设置', fields: [
        { name: 'homeJournalLimit', label: '首页最近信号条数', type: 'number', required: true, defaultValue: 8, min: 1, max: 48,
          admin: { description: '首页“最近的信号”最多展示的已发布文章数量；完整档案仍在文章档案页。' } },
        { name: 'archiveBatchSize', label: '档案页每批条数', type: 'number', required: true, defaultValue: 5, min: 1, max: 50,
          admin: { description: '文章档案页首批显示、以及每次点击“加载更多”追加的条数。' } },
      ] },
    ] },
  ],
}

export default buildConfig({
  admin: { user: Users.slug, importMap: { baseDir: here } },
  collections: [Users, Media, Posts, FriendLinks, Comments],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL || '' }, push: false }),
  sharp,
  typescript: { outputFile: path.join(here, 'payload-types.ts') },
})
