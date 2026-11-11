import { describe, expect, it } from 'vitest'
import { ORIGIN, request } from './helpers'

function form(path: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
  return request(path, { method: 'POST', body: new URLSearchParams(fields), headers: { Origin: ORIGIN, ...headers } })
}

async function login(): Promise<string> {
  const res = await form('/admin/login', { password: 'test-password' })
  expect(res.status).toBe(302)
  return res.headers.get('Set-Cookie')!.split(';')[0]
}

describe('admin panel', () => {
  it('redirects to login without a session', async () => {
    const res = await request('/admin')
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('/admin/login')
  })

  it('rejects a wrong password', async () => {
    expect((await form('/admin/login', { password: 'nope' })).status).toBe(401)
  })

  it('accepts a real session and rejects a forged one', async () => {
    expect((await request('/admin', { headers: { Cookie: await login() } })).status).toBe(200)
    const forged = await request('/admin', { headers: { Cookie: `session=${Date.now() + 1e9}.fake` } })
    expect(forged.status).toBe(302)
  })

  it('blocks cross-site form posts (CSRF)', async () => {
    const res = await form('/admin/paste', { markdown: '# x' }, { Cookie: await login(), Origin: 'https://evil.test' })
    expect(res.status).toBe(403)
  })

  it('rejects oversized login requests before parsing them', async () => {
    expect((await form('/admin/login', { password: 'a'.repeat(100_000) })).status).toBe(413)
  })
})
