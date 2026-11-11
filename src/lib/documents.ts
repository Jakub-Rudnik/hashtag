// Business logic, independent of HTTP. Routes (HTML or a future JSON API) call into this.
import { deleteDoc, getDoc, insertDoc, type Doc } from './db'
import { newId } from './id'
import { analyze } from './markdown'
import { deleteMarkdown, getMarkdown, putMarkdown } from './storage'

export const MAX_FILE_BYTES = 2 * 1024 * 1024
const ALLOWED_EXT = /\.(md|markdown|txt)$/i

export class UploadError extends Error {}

export async function createDocument(env: Env, file: File): Promise<Doc> {
  if (!ALLOWED_EXT.test(file.name)) throw new UploadError(`${file.name}: dozwolone tylko .md, .markdown, .txt`)
  if (file.size > MAX_FILE_BYTES) throw new UploadError(`${file.name}: plik większy niż 2 MB`)

  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    throw new UploadError(`${file.name}: plik nie jest poprawnym UTF-8`)
  }
  return saveDocument(env, text, file.name, file.name.replace(ALLOWED_EXT, ''))
}

/** Markdown pasted as text (e.g. from the clipboard). */
export async function createDocumentFromText(env: Env, text: string, title?: string): Promise<Doc> {
  if (!text.trim()) throw new UploadError('Wklejony tekst jest pusty')
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) {
    throw new UploadError('Wklejony tekst jest większy niż 2 MB')
  }
  const firstLine = text.trim().split('\n', 1)[0].replace(/^#+\s*/, '').slice(0, 80)
  return saveDocument(env, text, 'wklejony.md', firstLine || 'Bez tytułu', title?.trim() || undefined)
}

async function saveDocument(
  env: Env,
  text: string,
  filename: string,
  fallbackTitle: string,
  title?: string,
): Promise<Doc> {
  const now = Date.now()
  const doc: Doc = {
    id: newId(),
    title: title ?? analyze(text).title ?? fallbackTitle,
    custom_title: title ? 1 : 0,
    filename,
    size: new TextEncoder().encode(text).byteLength,
    created_at: now,
    updated_at: now,
  }
  // R2 first: a stray object without a DB row is harmless, a row without content is not.
  await putMarkdown(env.BUCKET, doc.id, text)
  await insertDoc(env.DB, doc)
  return doc
}

export async function loadDocument(env: Env, id: string): Promise<{ doc: Doc; markdown: string } | null> {
  const doc = await getDoc(env.DB, id)
  if (!doc) return null
  const markdown = await getMarkdown(env.BUCKET, id)
  return markdown === null ? null : { doc, markdown }
}

export async function removeDocument(env: Env, id: string): Promise<void> {
  await deleteDoc(env.DB, id)
  await deleteMarkdown(env.BUCKET, id)
}
