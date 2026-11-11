const key = (id: string) => `docs/${id}.md`

export async function putMarkdown(bucket: R2Bucket, id: string, text: string): Promise<void> {
  await bucket.put(key(id), text, {
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
  })
}

export async function getMarkdown(bucket: R2Bucket, id: string): Promise<string | null> {
  const obj = await bucket.get(key(id))
  return obj ? obj.text() : null
}

export async function deleteMarkdown(bucket: R2Bucket, id: string): Promise<void> {
  await bucket.delete(key(id))
}
