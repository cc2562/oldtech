import 'server-only'
import config from '@payload-config'
import { getPayload } from 'payload'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { PostSummary } from './posts'
import type { FriendLink, SocialLink } from './links'

export type SiteData = {
  name: string
  author: string
  description: string
  bio: string
  avatar?: { src: string; alt: string }
  requireCommentApproval: boolean
  /** How many recent posts the home console shows (admin «列表设置»). */
  homeJournalLimit: number
  /** Rows revealed per batch on the archive index (admin «列表设置»). */
  archiveBatchSize: number
  socials: SocialLink[]
}

/** Keeps an admin-editable number usable even if it is empty or out of range. */
function limitFromValue(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

export type PublicComment = { id: string; author: string; postedAt: string; text: string; site?: string; parentId?: string }
export type PublicPost = PostSummary & { body: SerializedEditorState | null; bodyMarkdown: string; pullQuote: string; comments: PublicComment[] }

type MediaDoc = { url?: string | null; alt?: string | null }
type CmsPost = {
  id: number | string; slug: string; title: string; excerpt?: string | null; category: PostSummary['category']
  publishedAt?: string | null; readingMinutes?: number | null; issue: string; featured?: boolean | null
  cover?: number | string | MediaDoc | null; body?: SerializedEditorState | null; bodyMarkdown?: string | null; pullQuote?: string | null
}

export async function cms() { return getPayload({ config }) }

function summary(post: CmsPost): PostSummary {
  const media = typeof post.cover === 'object' ? post.cover : null
  return {
    id: String(post.id), slug: post.slug, title: post.title, excerpt: post.excerpt || '',
    category: post.category, publishedAt: post.publishedAt?.slice(0, 10) || '',
    readingMinutes: post.readingMinutes || 1, issue: post.issue, featured: Boolean(post.featured),
    ...(media?.url ? { cover: { src: media.url, alt: media.alt || post.title } } : {}),
  }
}

export async function getPublishedPosts(options: { limit?: number } = {}): Promise<PostSummary[]> {
  const payload = await cms()
  const result = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    // `limit` keeps the home page cheap on large archives; without it every
    // published post is returned (the archive index pages through them locally).
    ...(options.limit ? { limit: options.limit } : { pagination: false }),
    depth: 1,
    overrideAccess: false,
  })
  return result.docs.map((post) => summary(post as unknown as CmsPost))
}

export async function getPost(slug: string, preview = false): Promise<PublicPost | null> {
  const payload = await cms()
  const result = await payload.find({
    collection: 'posts', where: preview ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    draft: preview, limit: 1, depth: 1, overrideAccess: preview,
  })
  const post = result.docs[0] as unknown as CmsPost | undefined
  if (!post) return null
  const comments = await payload.find({ collection: 'comments', where: { and: [{ post: { equals: post.id } }, { status: { equals: 'approved' } }] }, sort: 'createdAt', pagination: false, depth: 0, overrideAccess: false })
  return {
    ...summary(post), body: post.body ?? null, bodyMarkdown: post.bodyMarkdown || '', pullQuote: post.pullQuote || '',
    comments: comments.docs.map((item) => {
      let publicSite: string | undefined
      if (item.site) {
        try {
          const parsed = new URL(item.site)
          if (['http:', 'https:'].includes(parsed.protocol)) publicSite = parsed.href
        } catch { /* Invalid legacy values stay private. */ }
      }
      const parentId = typeof item.parent === 'object' ? item.parent?.id : item.parent
      return {
        id: String(item.id), author: item.author, text: item.text,
        postedAt: new Date(item.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        ...(publicSite ? { site: publicSite } : {}),
        ...(parentId ? { parentId: String(parentId) } : {}),
      }
    }),
  }
}

export async function getSite(): Promise<SiteData> {
  const payload = await cms()
  const value = await payload.findGlobal({ slug: 'site-settings', depth: 1, overrideAccess: false })
  const avatar = typeof value.avatar === 'object' ? value.avatar : null
  return {
    name: value.name || 'NEON / NOTES', author: value.author || '站长',
    description: value.description || '关于技术、设计与日常生活的个人记录。',
    bio: value.bio || '', requireCommentApproval: value.requireCommentApproval ?? true,
    homeJournalLimit: limitFromValue(value.homeJournalLimit, 8, 1, 48),
    archiveBatchSize: limitFromValue(value.archiveBatchSize, 5, 1, 50),
    ...(avatar?.url ? { avatar: { src: avatar.url, alt: avatar.alt || value.author || '站长头像' } } : {}),
    socials: (value.socialLinks || []).map((item: { id?: string | null; label: string; handle: string; url: string }, index: number) => ({ id: item.id || String(index), label: item.label, handle: item.handle, url: item.url })),
  }
}

export async function getFriendLinks(): Promise<FriendLink[]> {
  const payload = await cms()
  const result = await payload.find({ collection: 'friend-links', where: { status: { equals: 'published' } }, sort: 'issue', pagination: false, overrideAccess: false })
  return result.docs.map((item) => ({
    id: String(item.id), name: item.name, description: item.description, url: item.url,
    ...(item.icon && /^https?:\/\//i.test(item.icon) ? { iconUrl: item.icon } : {}),
    issue: item.issue,
  }))
}
