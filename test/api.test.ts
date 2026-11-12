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

    expect((await api('PUT', `/docs/${doc.id}?author=Codex`, '# Hello\n\nv2')).status).toBe(200)
    const page = await (await request(`/p/${doc.id}`)).text()
    expect(page).toContain('<p>v2</p>')
    expect(page).toContain('<span>Codex</span>')

    expect((await api('DELETE', `/docs/${doc.id}`)).status).toBe(204)
    expect((await request(`/p/${doc.id}`)).status).toBe(404)
  })

  it('rejects oversized documents', async () => {
    expect((await api('POST', '/docs', 'a'.repeat(3 * 1024 * 1024))).status).toBe(413)
  })
})

describe('images', () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

  function publish(markdown: string, files: File[]) {
    const body = new FormData()
    body.append('markdown', new File([markdown], 'page.md'))
    for (const f of files) body.append('files', f)
    return request('/api/docs', { method: 'POST', body, headers: { Authorization: 'Bearer test-token' } })
  }

  it('serves images referenced by local path from the uploaded files', async () => {
    const res = await publish('# Img\n\n![chart](/tmp/out/chart.png)', [new File([PNG], 'chart.png')])
    expect(res.status).toBe(201)
    const { id } = await res.json<{ id: string }>()

    const src = (await (await request(`/p/${id}`)).text()).match(/src="(\/img\/[^"]+)"/)?.[1]
    expect(src).toMatch(/^\/img\/[a-f0-9]{64}\.png$/)
    const img = await request(src!)
    expect(img.headers.get('Content-Type')).toBe('image/png')
    expect(new Uint8Array(await img.arrayBuffer())).toEqual(PNG)
  })

  it('rejects files that are not raster images, whatever their name', async () => {
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'], 'chart.png')
    expect((await publish('![x](chart.png)', [svg])).status).toBe(400)
  })
})
