import type { ImageRef } from './images'

export type Doc = {
  id: string
  title: string
  custom_title: 0 | 1 // 1 = typed in by hand
  author: string | null
  filename: string
  size: number
  created_at: number
  updated_at: number
}

export async function listDocs(db: D1Database): Promise<Doc[]> {
  const { results } = await db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all<Doc>()
  return results
}

export function getDoc(db: D1Database, id: string): Promise<Doc | null> {
  return db.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first<Doc>()
}

// Document row and its image bindings are written in one batch, which D1 runs as a transaction.

export async function insertDoc(db: D1Database, doc: Doc, images: ImageRef[] = []): Promise<void> {
  await db.batch([
    db
      .prepare(
        'INSERT INTO documents (id, title, custom_title, author, filename, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(doc.id, doc.title, doc.custom_title, doc.author, doc.filename, doc.size, doc.created_at, doc.updated_at),
    ...imageBindings(db, doc.id, images),
  ])
}

/** Images sent with an update are added; a re-uploaded file name points to the new image. */
export async function updateDoc(
  db: D1Database,
  doc: Pick<Doc, 'id' | 'title' | 'custom_title' | 'author' | 'size' | 'updated_at'>,
  images: ImageRef[] = [],
): Promise<void> {
  await db.batch([
    db
      .prepare('UPDATE documents SET title = ?, custom_title = ?, author = ?, size = ?, updated_at = ? WHERE id = ?')
      .bind(doc.title, doc.custom_title, doc.author, doc.size, doc.updated_at, doc.id),
    ...imageBindings(db, doc.id, images),
  ])
}

export async function deleteDoc(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM doc_images WHERE doc_id = ?').bind(id),
    db.prepare('DELETE FROM documents WHERE id = ?').bind(id),
  ])
}

function imageBindings(db: D1Database, docId: string, images: ImageRef[]): D1PreparedStatement[] {
  const stmt = db.prepare(
    'INSERT INTO doc_images (doc_id, name, key) VALUES (?, ?, ?) ON CONFLICT (doc_id, name) DO UPDATE SET key = excluded.key',
  )
  return images.map((i) => stmt.bind(docId, i.name, i.key))
}

/** File name -> image key. */
export async function getDocImages(db: D1Database, docId: string): Promise<Map<string, string>> {
  const { results } = await db
    .prepare('SELECT name, key FROM doc_images WHERE doc_id = ?')
    .bind(docId)
    .all<ImageRef>()
  return new Map(results.map((r) => [r.name, r.key]))
}
