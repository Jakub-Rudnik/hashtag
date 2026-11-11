export type Doc = {
  id: string
  title: string
  custom_title: 0 | 1 // 1 = typed in by hand
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

export async function insertDoc(db: D1Database, doc: Doc): Promise<void> {
  await db
    .prepare(
      'INSERT INTO documents (id, title, custom_title, filename, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(doc.id, doc.title, doc.custom_title, doc.filename, doc.size, doc.created_at, doc.updated_at)
    .run()
}

export async function deleteDoc(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM documents WHERE id = ?').bind(id).run()
}
