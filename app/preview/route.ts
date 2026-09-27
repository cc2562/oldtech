import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'
import { cms } from '@/lib/cms'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  const secret = url.searchParams.get('secret')
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return new Response('Invalid preview request', { status: 403 })
  }
  const payload = await cms()
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return new Response('Login required', { status: 403 })
  ;(await draftMode()).enable()
  return NextResponse.redirect(new URL(`/posts/${slug}`, url.origin))
}
