import { describe, expect, it } from 'vitest'
import { analyze } from '../src/lib/markdown'

// Uploaded Markdown is rendered on our origin, so it must never be able to run scripts.
describe('markdown safety', () => {
  it('escapes raw HTML', () => {
    const { html } = analyze('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
  })

  it('does not turn javascript: URLs into links', () => {
    expect(analyze('[x](javascript:alert(1))').html).not.toContain('href="javascript:')
  })
})
