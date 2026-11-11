import { Hono } from 'hono'
import { loadDocument } from '../lib/documents'
import { analyze } from '../lib/markdown'
import { DocPage, NotFoundPage } from '../views/pages'

export const publicRoutes = new Hono<{ Bindings: Env }>()

// Links are unlisted: keep them out of search engines.
publicRoutes.use('*', async (c, next) => {
  await next()
  c.header('X-Robots-Tag', 'noindex, nofollow')
})

publicRoutes.get('/:id', async (c) => {
  const found = await loadDocument(c.env, c.req.param('id'))
  if (!found) return c.html(NotFoundPage(), 404)
  const { html, title, description } = analyze(found.markdown)
  // A hand-typed title is shown as the heading, unless the Markdown brings its own H1.
  const showTitle = found.doc.custom_title === 1 && !title
  c.header('Cache-Control', 'no-cache')
  return c.html(DocPage({ doc: found.doc, html, description, showTitle }))
})

publicRoutes.get('/:id/raw', async (c) => {
  const found = await loadDocument(c.env, c.req.param('id'))
  if (!found) return c.text('Not found', 404)
  return c.body(found.markdown, 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
})
