// JSON API for scripts and tools (e.g. the Claude Code skill). Auth: `Authorization: Bearer <API_TOKEN>`.
// Body is raw Markdown; optional `?title=` sets a hand-typed title.
import { Hono, type Context } from 'hono'
import { secretMatches } from '../lib/auth'
import type { Doc } from '../lib/db'
import { createDocumentFromText, removeDocument, updateDocumentText, UploadError } from '../lib/documents'

export const apiRoutes = new Hono<{ Bindings: Env }>()

apiRoutes.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token || !(await secretMatches(token, c.env.API_TOKEN))) {
    return c.json({ error: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' })
  }
  await next()
})

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
  const doc = await createDocumentFromText(c.env, await c.req.text(), c.req.query('title'))
  return c.json(present(c, doc), 201)
})

apiRoutes.put('/docs/:id', async (c) => {
  const doc = await updateDocumentText(c.env, c.req.param('id'), await c.req.text(), c.req.query('title'))
  return doc ? c.json(present(c, doc)) : c.json({ error: 'Not found' }, 404)
})

apiRoutes.delete('/docs/:id', async (c) => {
  await removeDocument(c.env, c.req.param('id'))
  return c.body(null, 204)
})
