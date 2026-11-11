// No look-alike characters (0/O, 1/l/I). 10 chars of 54 symbols ≈ 57 bits: unguessable.
const ALPHABET = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'

export function newId(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
  let id = ''
  for (const b of bytes) {
    // Rejection sampling keeps the distribution uniform.
    if (b < 256 - (256 % ALPHABET.length)) id += ALPHABET[b % ALPHABET.length]
    if (id.length === length) return id
  }
  return id + newId(length - id.length)
}
