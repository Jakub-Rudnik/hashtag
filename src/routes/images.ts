import { Hono } from 'hono'
import { getImage, IMAGE_KEY } from '../lib/images'

export const imageRoutes = new Hono<{ Bindings: Env }>()

imageRoutes.get('/:key', async (c) => {
  const key = c.req.param('key')
  const obj = IMAGE_KEY.test(key) ? await getImage(c.env.BUCKET, key) : null
  if (!obj) return c.text('Not found', 404)
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      // Content-addressed: the bytes behind a URL never change.
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: obj.httpEtag,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Robots-Tag': 'noindex',
    },
  })
})
