// Business logic, independent of HTTP. Routes (HTML or a future JSON API) call into this.
import { deleteDoc, getDoc, getDocImages, insertDoc, updateDoc, type Doc } from './db'
import { UploadError } from './errors'
import { newId } from './id'
import type { ImageRef } from './images'
import { analyze } from './markdown'
import { deleteMarkdown, getMarkdown, putMarkdown } from './storage'

export { UploadError }

export const MAX_FILE_BYTES = 2 * 1024 * 1024
const ALLOWED_EXT = /\.(md|markdown|txt)$/i

// `images` are already stored (see storeImages); documents only record which names they use.

export async function createDocument(env: Env, file: File, images: ImageRef[] = []): Promise<Doc> {
  if (!ALLOWED_EXT.test(file.name)) throw new UploadError(`${file.name}: dozwolone tylko .md, .markdown, .txt`)
  if (file.size > MAX_FILE_BYTES) throw new UploadError(`${file.name}: plik większy niż 2 MB`)

  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    throw new UploadError(`${file.name}: plik nie jest poprawnym UTF-8`)
  }
  return saveDocument(env, text, file.name, file.name.replace(ALLOWED_EXT, ''), undefined, images)
}

function validateText(text: string): void {
  if (!text.trim()) throw new UploadError('Tekst jest pusty')
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) {
    throw new UploadError('Tekst jest większy niż 2 MB')
  }
}

/** Markdown sent as text (clipboard paste, API). */
export async function createDocumentFromText(
  env: Env,
  text: string,
  title?: string,
  images: ImageRef[] = [],
): Promise<Doc> {
  validateText(text)
  const firstLine = text.trim().split('\n', 1)[0].replace(/^#+\s*/, '').slice(0, 80)
  return saveDocument(env, text, 'wklejony.md', firstLine || 'Bez tytułu', title?.trim() || undefined, images)
}

async function saveDocument(
  env: Env,
  text: string,
  filename: string,
  fallbackTitle: string,
  title?: string,
  images: ImageRef[] = [],
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
  await insertDoc(env.DB, doc, images)
  return doc
}

/**
 * Replace a document's content, keeping its link. Title: the given one if any, else a previous
 * hand-typed title is kept, else the new Markdown's H1, else the old title. Previously attached images
 * stay attached, so only new or changed ones need to be sent again.
 */
export async function updateDocumentText(
  env: Env,
  id: string,
  text: string,
  title?: string,
  images: ImageRef[] = [],
): Promise<Doc | null> {
  validateText(text)
  const old = await getDoc(env.DB, id)
  if (!old) return null
  const custom = title?.trim()
  const doc: Doc = {
    ...old,
    title: custom || (old.custom_title ? old.title : (analyze(text).title ?? old.title)),
    custom_title: custom || old.custom_title ? 1 : 0,
    size: new TextEncoder().encode(text).byteLength,
    updated_at: Date.now(),
  }
  await putMarkdown(env.BUCKET, id, text)
  await updateDoc(env.DB, doc, images)
  return doc
}

export async function loadDocument(
  env: Env,
  id: string,
): Promise<{ doc: Doc; markdown: string; images: Map<string, string> } | null> {
  const doc = await getDoc(env.DB, id)
  if (!doc) return null
  const [markdown, images] = await Promise.all([getMarkdown(env.BUCKET, id), getDocImages(env.DB, id)])
  return markdown === null ? null : { doc, markdown, images }
}

export async function removeDocument(env: Env, id: string): Promise<void> {
  await deleteDoc(env.DB, id)
  await deleteMarkdown(env.BUCKET, id)
}
