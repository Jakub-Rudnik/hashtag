import { describe, expect, it } from 'vitest'
import { api, createDoc, request } from './helpers'

describe('API', () => {
  it('rejects missing and wrong tokens', async () => {
    expect((await request('/api/docs', { method: 'POST', body: '# x' })).status).toBe(401)
    expect((await api('POST', '/docs', '# x', 'wrong')).status).toBe(401)
  })

  it('creates, serves, updates and deletes a document', async () => {
    const doc = await createDoc('# Hello\n\nv1')
    expect(await (await request(`/p/${doc.id}`)).text()).toContain('<p>v1</p>')

    expect((await api('PUT', `/docs/${doc.id}`, '# Hello\n\nv2')).status).toBe(200)
    expect(await (await request(`/p/${doc.id}`)).text()).toContain('<p>v2</p>')

    expect((await api('DELETE', `/docs/${doc.id}`)).status).toBe(204)
    expect((await request(`/p/${doc.id}`)).status).toBe(404)
  })

  it('rejects oversized documents', async () => {
    expect((await api('POST', '/docs', 'a'.repeat(3 * 1024 * 1024))).status).toBe(413)
  })
})
