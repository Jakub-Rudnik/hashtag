// JSON API for scripts and tools (e.g. the Claude Code skill). Auth: `Authorization: Bearer <API_TOKEN>`.
// Body is raw Markdown, or multipart with a `markdown` part and image `files` (referenced by file name).
// Optional `?title=` sets a hand-typed title, `?author=` the author (multipart: `title`, `author` parts).
import { Hono, type Context } from 'hono'
import { secretMatches } from '../lib/auth'
import type { Doc } from '../lib/db'
import { storeImages } from '../lib/images'
import { LIMITS, limitBody } from '../lib/limits'
import {
  createDocumentFromText,
  removeDocument,
  updateDocumentText,
  UploadError,
  type DocOptions,
} from '../lib/documents'

export const apiRoutes = new Hono<{ Bindings: Env }>()

apiRoutes.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token || !(await secretMatches(token, c.env.API_TOKEN))) {
    return c.json({ error: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' })
  }
  await next()
})

const isMultipart = (c: Context) => c.req.header('Content-Type')?.startsWith('multipart/form-data') ?? false

apiRoutes.use('*', (c, next) =>
  limitBody(isMultipart(c) ? LIMITS.apiMultipart : LIMITS.api, true)(c, next),
)

/** Markdown plus title, author and stored images from either request shape. */
async function readInput(c: Context<{ Bindings: Env }>): Promise<{ text: string; opts: DocOptions }> {
  const title = c.req.query('title')
  const author = c.req.query('author')
  if (!isMultipart(c)) return { text: await c.req.text(), opts: { title, author } }

  const body = await c.req.parseBody({ all: true })
  const field = (name: string) => [body[name]].flat()[0]
  const markdown = field('markdown')
  const text = markdown instanceof File ? await markdown.text() : typeof markdown === 'string' ? markdown : ''
  const str = (v: unknown, fallback?: string) => (typeof v === 'string' ? v : fallback)
  const files = [body.files].flat().filter((f): f is File => f instanceof File && f.size > 0)
  return {
    text,
    opts: {
      title: str(field('title'), title),
      author: str(field('author'), author),
      images: await storeImages(c.env.BUCKET, files),
    },
  }
}

apiRoutes.onError((err, c) => {
  if (err instanceof UploadError) return c.json({ error: err.message }, 400)
  throw err
})

const present = (c: Context, doc: Doc) => ({
  id: doc.id,
  title: doc.title,
  url: `${new URL(c.req.url).origin}/p/${doc.id}`,
})

apiRoutes.post('/docs', async (c) => {
  const { text, opts } = await readInput(c)
  const doc = await createDocumentFromText(c.env, text, opts)
  return c.json(present(c, doc), 201)
})

apiRoutes.put('/docs/:id', async (c) => {
  const { text, opts } = await readInput(c)
  const doc = await updateDocumentText(c.env, c.req.param('id'), text, opts)
  return doc ? c.json(present(c, doc)) : c.json({ error: 'Not found' }, 404)
})

apiRoutes.delete('/docs/:id', async (c) => {
  await removeDocument(c.env, c.req.param('id'))
  return c.body(null, 204)
})
