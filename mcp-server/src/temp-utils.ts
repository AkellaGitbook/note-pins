import { writeFile, unlink } from 'fs/promises'
import { createWriteStream } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { get as httpGet } from 'http'
import { get as httpsGet } from 'https'
import type { IncomingMessage } from 'http'

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'])

export function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(ext.toLowerCase())
}

// Detect image type from the first bytes of a base64 string (raw or data URI)
export function detectImageExtension(base64Data: string): string {
  const raw = stripDataUriPrefix(base64Data)
  // Decode just the first 12 bytes
  const bytes = Buffer.from(raw.slice(0, 16), 'base64').slice(0, 12)

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return '.jpg'
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return '.png'
  // GIF: 47 49 46
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return '.gif'
  // WEBP: RIFF????WEBP — bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return '.webp'
  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return '.bmp'

  return '.jpg' // fallback
}

function contentTypeToExt(contentType: string): string {
  const ct = contentType.toLowerCase()
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg'
  if (ct.includes('png')) return '.png'
  if (ct.includes('gif')) return '.gif'
  if (ct.includes('webp')) return '.webp'
  if (ct.includes('bmp')) return '.bmp'
  return ''
}

function extFromUrl(urlStr: string): string {
  try {
    const pathname = new URL(urlStr).pathname
    const dot = pathname.lastIndexOf('.')
    if (dot !== -1) return pathname.slice(dot).toLowerCase().split('?')[0]
  } catch { /* ignore */ }
  return ''
}

export function downloadToTempFile(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const makeRequest = (url: string, redirectsLeft = 5) => {
      const getter = url.startsWith('https') ? httpsGet : httpGet
      getter(url, (res: IncomingMessage) => {
        const status = res.statusCode ?? 0
        if ((status === 301 || status === 302 || status === 307 || status === 308) && res.headers.location) {
          res.resume()
          if (redirectsLeft <= 0) { reject(new Error('Too many redirects')); return }
          makeRequest(res.headers.location, redirectsLeft - 1)
          return
        }
        if (status !== 200) {
          res.resume()
          reject(new Error(`Download failed: HTTP ${status}`))
          return
        }
        const contentType = res.headers['content-type'] ?? ''
        let ext = contentTypeToExt(contentType)
        if (!ext) ext = extFromUrl(url)
        if (!ext || !isAllowedExtension(ext)) {
          res.resume()
          reject(new Error(`Unsupported image type. Content-Type: "${contentType}"`))
          return
        }
        const tmpPath = join(tmpdir(), `note-pins-${randomUUID()}${ext}`)
        const stream = createWriteStream(tmpPath)
        res.pipe(stream)
        stream.on('finish', () => resolve(tmpPath))
        stream.on('error', reject)
        res.on('error', reject)
      }).on('error', reject)
    }
    makeRequest(imageUrl)
  })
}

function stripDataUriPrefix(data: string): string {
  if (data.startsWith('data:')) {
    const commaIdx = data.indexOf(',')
    if (commaIdx !== -1) return data.slice(commaIdx + 1)
  }
  return data
}

export async function base64ToTempFile(base64Data: string, ext: string): Promise<string> {
  const raw = stripDataUriPrefix(base64Data)
  const filePath = join(tmpdir(), `note-pins-${randomUUID()}${ext}`)
  await writeFile(filePath, Buffer.from(raw, 'base64'))
  return filePath
}

export async function cleanupTempFile(filePath: string): Promise<void> {
  try { await unlink(filePath) } catch { /* already gone */ }
}
