import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { checkPassword, endSession, requireAdmin, startSession } from '../lib/auth'
import { listDocs } from '../lib/db'
import { LIMITS, limitBody } from '../lib/limits'
import { createDocument, createDocumentFromText, removeDocument, UploadError } from '../lib/documents'
import { AdminPage, LoginPage } from '../views/pages'

export const adminRoutes = new Hono<{ Bindings: Env }>()

adminRoutes.use('*', csrf())
adminRoutes.use('*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
})

// --- public part: login ---
adminRoutes.get('/login', (c) => c.html(LoginPage({})))

adminRoutes.post('/login', limitBody(LIMITS.login), async (c) => {
  const { password } = await c.req.parseBody()
  if (typeof password !== 'string' || !(await checkPassword(c.env, password))) {
    return c.html(LoginPage({ error: true }), 401)
  }
  await startSession(c)
  return c.redirect('/admin')
})

// --- everything below requires a session ---
adminRoutes.use('*', requireAdmin)

adminRoutes.post('/logout', (c) => {
  endSession(c)
  return c.redirect('/admin/login')
})

adminRoutes.get('/', async (c) => {
  const docs = await listDocs(c.env.DB)
  const errors = c.req.queries('error') ?? []
  const created = c.req.query('created')
  return c.html(AdminPage({ docs, origin: new URL(c.req.url).origin, errors, created }))
})

adminRoutes.post('/upload', limitBody(LIMITS.upload), async (c) => {
  const body = await c.req.parseBody({ all: true })
  const files = [body.files].flat().filter((f): f is File => f instanceof File && f.size > 0)

  const errors: string[] = []
  for (const file of files) {
    try {
      await createDocument(c.env, file)
    } catch (e) {
      if (!(e instanceof UploadError)) throw e
      errors.push(e.message)
    }
  }
  const qs = new URLSearchParams(errors.map((e) => ['error', e]))
  return c.redirect(errors.length ? `/admin?${qs}` : '/admin')
})

adminRoutes.post('/paste', limitBody(LIMITS.paste), async (c) => {
  const { markdown, title } = await c.req.parseBody()
  try {
    const doc = await createDocumentFromText(
      c.env,
      typeof markdown === 'string' ? markdown.replace(/\r\n/g, '\n') : '',
      typeof title === 'string' ? title : undefined,
    )
    return c.redirect(`/admin?created=${doc.id}`)
  } catch (e) {
    if (!(e instanceof UploadError)) throw e
    return c.redirect(`/admin?${new URLSearchParams({ error: e.message })}`)
  }
})

adminRoutes.post('/:id/delete', async (c) => {
  await removeDocument(c.env, c.req.param('id'))
  return c.redirect('/admin')
})
