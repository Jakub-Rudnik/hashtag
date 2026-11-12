import { bodyLimit } from 'hono/body-limit'
import { MAX_FILE_BYTES } from './documents'

// Workers buffer request bodies in a 128 MB isolate; reject oversized ones before parsing.
export const LIMITS = {
  login: 16 * 1024,
  // Form-urlencoded text can grow up to ~4.5x (e.g. "ł" -> "%C5%82"), so allow headroom.
  paste: MAX_FILE_BYTES * 5,
  upload: 30 * 1024 * 1024, // several files at once, images included
  api: MAX_FILE_BYTES + 64 * 1024, // raw Markdown
  apiMultipart: 30 * 1024 * 1024, // Markdown + images
}

export const limitBody = (maxSize: number, json = false) =>
  bodyLimit({
    maxSize,
    onError: (c) => (json ? c.json({ error: 'Payload too large' }, 413) : c.text('Za duże zapytanie', 413)),
  })
