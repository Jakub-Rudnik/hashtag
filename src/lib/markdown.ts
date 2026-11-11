import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import MarkdownIt, { type Token } from 'markdown-it'

const languages = {
  bash, c, cpp, csharp, css, diff, dockerfile, go, java, javascript,
  json, markdown, python, rust, sql, typescript, xml, yaml,
}
for (const [name, lang] of Object.entries(languages)) hljs.registerLanguage(name, lang)

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// html: false escapes any raw HTML in the source, and markdown-it's link validation
// rejects javascript:/vbscript:/file: URLs, so the output is safe to embed as-is.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      const out = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      return `<pre class="hljs"><code class="language-${escapeHtml(lang)}">${out}</code></pre>`
    }
    return '' // markdown-it falls back to escaped plain <pre><code>
  },
})

// Anchor ids on headings, so sections can be linked: /p/abc#installation
md.core.ruler.push('heading_ids', (state) => {
  const used = new Set<string>()
  state.tokens.forEach((token, i) => {
    if (token.type !== 'heading_open') return
    const base = slugify(plainText(state.tokens[i + 1])) || 'section'
    let id = base
    for (let n = 1; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    token.attrSet('id', id)
  })
})

// Open external links in a new tab.
const defaultLinkOpen = md.renderer.rules.link_open ?? ((t, i, o, _e, self) => self.renderToken(t, i, o))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  if (/^https?:\/\//i.test(String(tokens[idx].attrGet('href') ?? ''))) {
    tokens[idx].attrSet('target', '_blank')
    tokens[idx].attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

function plainText(inline: Token | undefined): string {
  return (inline?.children ?? [])
    .filter((t) => t.type === 'text' || t.type === 'code_inline')
    .map((t) => t.content)
    .join('')
}

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export type Rendered = { html: string; title: string | null; description: string | null }

/** Parse once; returns HTML plus metadata (first H1, first paragraph) for <title> and link previews. */
export function analyze(source: string): Rendered {
  const env = {}
  const tokens = md.parse(source, env)
  let title: string | null = null
  let description: string | null = null
  tokens.forEach((t, i) => {
    if (!title && t.type === 'heading_open' && t.tag === 'h1') title = plainText(tokens[i + 1]) || null
    if (!description && t.type === 'paragraph_open') description = plainText(tokens[i + 1]).slice(0, 200) || null
  })
  return { html: md.renderer.render(tokens, md.options, env), title, description }
}
