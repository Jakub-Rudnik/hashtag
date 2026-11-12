import { UploadError } from './errors'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i
/** Public image path: /img/<sha256>.<ext> */
export const IMAGE_KEY = /^[a-f0-9]{64}\.(png|jpg|gif|webp|avif)$/

const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
} as const
type ImageType = keyof typeof CONTENT_TYPES

/** An uploaded image as referenced from Markdown: file name -> stored object. */
export type ImageRef = { name: string; key: string }

// Trust the bytes, not the file name. SVG is deliberately unsupported: it can carry scripts.
function sniff(b: Uint8Array): ImageType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to))
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (ascii(0, 4) === 'GIF8') return 'gif'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp'
  if (ascii(4, 8) === 'ftyp' && ftypBrands(b).some((brand) => brand === 'avif' || brand === 'avis')) return 'avif'
  return null
}

// ISO-BMFF `ftyp` box: size, "ftyp", major brand, minor version, then compatible brands.
// AVIF may declare itself only among the compatible brands (e.g. major brand "mif1").
function ftypBrands(b: Uint8Array): string[] {
  const size = Math.min(new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(0), b.length, 256)
  const brands = [String.fromCharCode(...b.subarray(8, 12))]
  for (let i = 16; i + 4 <= size; i += 4) brands.push(String.fromCharCode(...b.subarray(i, i + 4)))
  return brands
}

export const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path

/** Validates all files first, then stores them content-addressed (same image = same object). */
export async function storeImages(bucket: R2Bucket, files: File[]): Promise<ImageRef[]> {
  const prepared: { name: string; key: string; type: ImageType; bytes: Uint8Array }[] = []
  for (const file of files) {
    const name = baseName(file.name)
    if (prepared.some((p) => p.name === name)) throw new UploadError(`${name}: dwa obrazki o tej samej nazwie`)
    if (file.size > MAX_IMAGE_BYTES) throw new UploadError(`${name}: obrazek większy niż 10 MB`)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const type = sniff(bytes)
    if (!type) throw new UploadError(`${name}: dozwolone tylko obrazki PNG, JPEG, GIF, WebP, AVIF`)
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
    prepared.push({ name, key: `${hash}.${type}`, type, bytes })
  }
  for (const p of prepared) {
    await bucket.put(`img/${p.key}`, p.bytes, { httpMetadata: { contentType: CONTENT_TYPES[p.type] } })
  }
  return prepared.map(({ name, key }) => ({ name, key }))
}

export function getImage(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return bucket.get(`img/${key}`)
}
