import { randomUUID } from 'node:crypto'

/** Shape enforced by the `posts.slug` field validation. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * URL-safe identifier used when an author leaves the slug empty — mirrors the
 * "auto id" behaviour of Typecho-style blogs. Lowercase hex only, so the value
 * always satisfies `SLUG_PATTERN` (12 chars ≈ 48 bits of randomness).
 */
export function randomSlug(length = 12): string {
  return randomUUID().replace(/-/g, '').slice(0, length)
}

/** Fallback that never repeats, used when a random candidate collides. */
export function timestampedSlug(): string {
  return `${randomSlug(6)}-${Date.now().toString(36)}`
}
