import { createHash } from 'node:crypto'
import { cms, getSite } from '@/lib/cms'

export const runtime = 'nodejs'

function isSameSiteRequest(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return false

  // Browsers calculate Sec-Fetch-Site before a local proxy rewrites the host.
  // This keeps CSRF protection intact when Next receives an internal URL that
  // differs from the address used by the browser (for example 198.18.0.1).
  if (request.headers.get('sec-fetch-site') === 'same-origin') return true

  try {
    const originURL = new URL(origin)
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || request.headers.get('host')
    if (host && originURL.host === host) return true
    return origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return Response.json({ error: '请求来源无效' }, { status: 403 })
  if (Number(request.headers.get('content-length') || 0) > 8_000) return Response.json({ error: '内容过长' }, { status: 413 })

  let data: Record<string, unknown>
  try {
    const raw = await request.text()
    if (raw.length > 8_000) return Response.json({ error: '内容过长' }, { status: 413 })
    data = JSON.parse(raw)
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid JSON')
  } catch { return Response.json({ error: '请求格式无效' }, { status: 400 }) }
  const slug = typeof data.slug === 'string' ? data.slug : ''
  const author = typeof data.author === 'string' ? data.author.trim() : ''
  const text = typeof data.text === 'string' ? data.text.trim() : ''
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  const site = typeof data.site === 'string' ? data.site.trim() : ''
  const requestedParentId = data.parentId === undefined || data.parentId === null || data.parentId === '' ? undefined : Number(data.parentId)
  if (data.trap) return Response.json({ status: 'pending' }, { status: 202 })
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !author || author.length > 24 || !text || text.length > 2000 || email.length > 254 || site.length > 500) {
    return Response.json({ error: '昵称或评论内容无效' }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: '邮箱格式无效' }, { status: 400 })
  if (requestedParentId !== undefined && (!Number.isInteger(requestedParentId) || requestedParentId <= 0)) return Response.json({ error: '回复对象无效' }, { status: 400 })
  if (site) {
    try { if (!['http:', 'https:'].includes(new URL(site).protocol)) throw new Error() }
    catch { return Response.json({ error: '个人网址无效' }, { status: 400 }) }
  }

  const payload = await cms()
  const post = await payload.find({ collection: 'posts', where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] }, limit: 1, depth: 0, overrideAccess: false })
  if (!post.docs.length) return Response.json({ error: '文章不存在' }, { status: 404 })

  let parentId: number | undefined
  if (requestedParentId !== undefined) {
    try {
      const parent = await payload.findByID({ collection: 'comments', id: requestedParentId, depth: 0, overrideAccess: true })
      const parentPostId = typeof parent.post === 'object' ? parent.post.id : parent.post
      if (parent.status !== 'approved' || String(parentPostId) !== String(post.docs[0].id)) throw new Error('Invalid parent')
      parentId = parent.id
    } catch {
      return Response.json({ error: '回复对象不存在或尚未公开' }, { status: 400 })
    }
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const ipHash = createHash('sha256').update(`${process.env.PAYLOAD_SECRET}:${ip}`).digest('hex')
  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const recent = await payload.find({ collection: 'comments', where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: since } }] }, sort: '-createdAt', limit: 5, depth: 0, overrideAccess: true })
  if (recent.docs.length >= 5 || (recent.docs[0] && Date.now() - new Date(recent.docs[0].createdAt).getTime() < 30_000)) {
    return Response.json({ error: '发送太频繁，请稍后再试' }, { status: 429 })
  }

  const settings = await getSite()
  const status = settings.requireCommentApproval ? 'pending' : 'approved'
  const comment = await payload.create({ collection: 'comments', data: { post: post.docs[0].id, parent: parentId, author, text, email: email || undefined, site: site || undefined, ipHash, status }, overrideAccess: true })
  return Response.json({
    status,
    ...(status === 'approved' ? { comment: {
      id: String(comment.id), author, text,
      postedAt: new Date(comment.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      ...(site ? { site } : {}), ...(parentId ? { parentId: String(parentId) } : {}),
    } } : {}),
  }, { status: status === 'pending' ? 202 : 201 })
}
