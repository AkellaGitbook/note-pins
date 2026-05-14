import type { Note, PhotoPin, Pin } from './types.js'

const PORT = process.env['NOTE_PINS_BRIDGE_PORT'] ?? '47890'
const BASE_URL = `http://127.0.0.1:${PORT}`

const APP_NOT_RUNNING =
  'Note Pins app is not running. Launch the Note Pins desktop app first, then retry.'

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error(APP_NOT_RUNNING)
  }

  const json = await res.json() as { ok: boolean; data?: T; error?: string }
  if (!json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json.data as T
}

export async function health(): Promise<boolean> {
  try {
    await request('GET', '/health')
    return true
  } catch {
    return false
  }
}

export async function listPins(): Promise<{ notes: Note[]; photoPins: PhotoPin[] }> {
  return request('GET', '/pins')
}

export async function getPin(id: string): Promise<Pin | null> {
  try {
    return await request<Pin>('GET', `/pins/${id}`)
  } catch (e: any) {
    if (String(e.message).includes('not found')) return null
    throw e
  }
}

export async function createAndPostNote(body: {
  content: string
  title?: string
  theme?: string
}): Promise<Note & { _type: 'note' }> {
  return request('POST', '/notes', body)
}

export async function createAndPostPhotoPin(body: {
  sourcePath: string
  title?: string
  caption?: string
}): Promise<PhotoPin & { _type: 'photo' }> {
  return request('POST', '/photo-pins', body)
}

export async function updateNoteContent(
  id: string,
  body: { content?: string; slateContent?: string; title?: string }
): Promise<Note & { _type: 'note' }> {
  return request('PATCH', `/notes/${id}/content`, body)
}

export async function updateNoteStruckKeys(
  id: string,
  struckKeys: string[]
): Promise<Note & { _type: 'note' }> {
  return request('PATCH', `/notes/${id}/struck-keys`, { struckKeys })
}

export async function replacePhotoPinImage(
  id: string,
  sourcePath: string
): Promise<PhotoPin & { _type: 'photo' }> {
  return request('PUT', `/photo-pins/${id}/image`, { sourcePath })
}

export async function postPinToDesktop(id: string): Promise<Pin> {
  return request('POST', `/pins/${id}/post`)
}

export async function movePinBack(id: string): Promise<Pin> {
  return request('POST', `/pins/${id}/move-back`)
}

export async function deletePin(id: string): Promise<{ deleted: boolean; type: string; id: string }> {
  return request('DELETE', `/pins/${id}`)
}
