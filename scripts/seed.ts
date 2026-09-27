import config from '../payload.config.js'
import { getPayload } from 'payload'
import { postDetails } from '../lib/postDetails.js'
import { friendLinks } from '../lib/links.js'
import type { Post } from '../payload-types.js'

function paragraphs(lines: string[]): Post['body'] {
  return {
    root: {
      type: 'root', version: 1, direction: null, format: '', indent: 0,
      children: lines.map((line) => ({
        type: 'paragraph', version: 1, direction: null, format: '', indent: 0,
        children: [{ type: 'text', version: 1, text: line, detail: 0, format: 0, mode: 'normal', style: '' }],
      })),
    },
  }
}

const payload = await getPayload({ config })

for (const demo of postDetails) {
  const exists = await payload.find({ collection: 'posts', where: { slug: { equals: demo.slug } }, draft: true, limit: 1 })
  if (exists.totalDocs) continue
  const post = await payload.create({
    collection: 'posts', draft: true,
    data: {
      title: demo.title, slug: demo.slug, excerpt: demo.excerpt, category: demo.category,
      issue: demo.issue, featured: demo.featured || false, publishedAt: `${demo.publishedAt}T00:00:00.000Z`,
      readingMinutes: demo.readingMinutes, body: paragraphs(demo.body), pullQuote: demo.pullQuote,
      _status: 'draft',
    },
  })
  for (const comment of demo.comments) {
    await payload.create({ collection: 'comments', data: { post: post.id, author: comment.author, text: comment.text, status: 'pending' } })
  }
}

for (const demo of friendLinks) {
  const exists = await payload.find({ collection: 'friend-links', where: { url: { equals: demo.url } }, limit: 1 })
  if (exists.totalDocs) continue
  await payload.create({ collection: 'friend-links', data: {
    name: demo.name, description: demo.description, url: demo.url, icon: demo.iconUrl,
    issue: demo.issue, status: 'draft',
  } })
}

payload.logger.info('Demo articles, comments, and friend links are available as unpublished references.')
