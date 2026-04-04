// Crypto utility — hashing + AES-256-GCM helper functions
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const sha256 = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const toBase64 = (bytes: Uint8Array): string => {
  let out = ''
  bytes.forEach((b) => {
    out += String.fromCharCode(b)
  })
  return btoa(out)
}

const fromBase64 = (b64: string): Uint8Array => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes
}

export const deriveAesKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export const encryptText = async (plainText: string, passphrase: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveAesKey(passphrase, salt)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plainText))
  const cipher = new Uint8Array(cipherBuf)

  return JSON.stringify({
    v: 1,
    alg: 'AES-256-GCM',
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(cipher),
  })
}

export const decryptText = async (payload: string, passphrase: string): Promise<string> => {
  const parsed = JSON.parse(payload) as { salt: string; iv: string; data: string }
  const salt = fromBase64(parsed.salt)
  const iv = fromBase64(parsed.iv)
  const data = fromBase64(parsed.data)
  const key = await deriveAesKey(passphrase, salt)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return decoder.decode(plainBuf)
}
