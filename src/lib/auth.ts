import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'

const COOKIE = 'session'
const SESSION_MS = 30 * 24 * 60 * 60 * 1000

type Ctx = Context<{ Bindings: Env }>

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
}

// Constant-time compare of two equal-length digests.
function digestsEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function checkPassword(env: Env, password: string): Promise<boolean> {
  if (!env.ADMIN_PASSWORD) return false // never allow login with an unset password
  const [a, b] = await Promise.all([sha256(password), sha256(env.ADMIN_PASSWORD)])
  return digestsEqual(a, b)
}

export async function startSession(c: Ctx): Promise<void> {
  const expires = Date.now() + SESSION_MS
  await setSignedCookie(c, COOKIE, String(expires), c.env.SESSION_SECRET, {
    path: '/',
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    maxAge: SESSION_MS / 1000,
  })
}

export function endSession(c: Ctx): void {
  deleteCookie(c, COOKIE, { path: '/' })
}

export const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const value = await getSignedCookie(c, c.env.SESSION_SECRET, COOKIE)
  if (!value || Number(value) < Date.now()) return c.redirect('/admin/login')
  await next()
}
