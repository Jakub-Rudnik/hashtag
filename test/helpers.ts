import { exports } from 'cloudflare:workers'

export const ORIGIN = 'https://hashtag.test'

export function request(path: string, init: RequestInit = {}): Promise<Response> {
  return exports.default.fetch(new Request(ORIGIN + path, { redirect: 'manual', ...init }))
}

export function api(method: string, path: string, body?: string, token = 'test-token'): Promise<Response> {
  return request(`/api${path}`, {
    method,
    body,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}

export async function createDoc(markdown: string): Promise<{ id: string; url: string }> {
  const res = await api('POST', '/docs', markdown)
  if (res.status !== 201) throw new Error(`create failed: ${res.status} ${await res.text()}`)
  return res.json()
}
