import { createServer, IncomingMessage, ServerResponse, Server } from 'http'
import { spawn, ChildProcess } from 'child_process'
import { copyFileSync, unlinkSync, existsSync, writeFileSync } from 'fs'
import { join, extname } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'
import { app, BrowserWindow, clipboard } from 'electron'
import {
  getAllNotes,
  getAllPhotoPins,
  getNoteById,
  getPhotoPinById,
  createNote,
  updateNote,
  deleteNote,
  createPhotoPin,
  updatePhotoPin,
  deletePhotoPin,
  getImagesDir,
} from './db'
import { FloatingWindowManager } from './floating-window-manager'
import { FloatingPhotoManager } from './floating-photo-manager'
import { IPC } from '../shared/ipc-channels'
import type { Note, PhotoPin } from '../shared/types'

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'])

const THEME_COLORS: Record<string, string> = {
  yellow: '#fef3c7',
  blue: '#dbeafe',
  green: '#d1fae5',
  pink: '#fce7f3',
  purple: '#ede9fe',
  white: '#ffffff',
  dark: '#1f2937',
  orange: '#ffedd5',
}

let server: Server | null = null
let mcpProcess: ChildProcess | null = null
let ngrokProcess: ChildProcess | null = null
let _fwm: FloatingWindowManager | null = null
let _fpm: FloatingPhotoManager | null = null
let _mainWindow: BrowserWindow | null = null

// ── Helpers ───────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      if (!raw) { resolve({}); return }
      try { resolve(JSON.parse(raw)) }
      catch { reject({ status: 400, error: 'Invalid JSON body' }) }
    })
    req.on('error', (err) => reject({ status: 500, error: String(err) }))
  })
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) })
  res.end(json)
}

function ok(res: ServerResponse, data: unknown): void {
  send(res, 200, { ok: true, data })
}

function err(res: ServerResponse, status: number, error: string): void {
  send(res, status, { ok: false, error })
}

function pushMain(channel: string, payload: unknown): void {
  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send(channel, payload)
  }
}

function textToSlate(text: string): string {
  const lines = text.split('\n')
  const blocks = lines.map((line) => ({ type: 'paragraph', children: [{ text: line }] }))
  return JSON.stringify(blocks)
}

function taggedPin(entity: Note | PhotoPin, type: 'note' | 'photo'): unknown {
  return { ...entity, _type: type }
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleHealth(res: ServerResponse): Promise<void> {
  ok(res, { ok: true })
}

async function handleGetPins(res: ServerResponse): Promise<void> {
  ok(res, { notes: getAllNotes(), photoPins: getAllPhotoPins() })
}

async function handleGetPin(res: ServerResponse, id: string): Promise<void> {
  const note = getNoteById(id)
  if (note) { ok(res, taggedPin(note, 'note')); return }
  const pin = getPhotoPinById(id)
  if (pin) { ok(res, taggedPin(pin, 'photo')); return }
  err(res, 404, `No pin found with id "${id}"`)
}

async function handleCreateNote(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req) as any
  if (!body.content && body.content !== '') {
    err(res, 400, 'content is required'); return
  }
  const slateContent = textToSlate(String(body.content))
  const theme: string = body.theme && THEME_COLORS[body.theme] ? body.theme : 'yellow'
  const backgroundColor = THEME_COLORS[theme]
  const note = createNote({
    title: body.title || 'New Note',
    content: slateContent,
    theme,
    backgroundColor,
    status: 'posted',
  })
  _fwm!.openNote(note)
  pushMain(IPC.MAIN_NOTE_ADDED, note)
  ok(res, taggedPin(note, 'note'))
}

async function handleCreatePhotoPin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req) as any
  if (!body.sourcePath) { err(res, 400, 'sourcePath is required'); return }
  const ext = extname(String(body.sourcePath)).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    err(res, 400, `Unsupported image format "${ext}". Allowed: jpg, jpeg, png, gif, bmp, webp`); return
  }
  const partial: Partial<PhotoPin> = { status: 'posted' }
  if (body.title) partial.title = String(body.title)
  if (body.caption) partial.caption = String(body.caption)
  const pin = createPhotoPin(String(body.sourcePath), partial)
  _fpm!.openPin(pin)
  pushMain(IPC.MAIN_PHOTO_PIN_ADDED, pin)
  ok(res, taggedPin(pin, 'photo'))
}

async function handleUpdateNoteContent(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
  const body = await readBody(req) as any
  const note = getNoteById(id)
  if (!note) { err(res, 404, `Note "${id}" not found`); return }

  const patch: Partial<Note> = {}
  if (body.slateContent !== undefined) {
    try { JSON.parse(body.slateContent) } catch { err(res, 400, 'Invalid slateContent JSON'); return }
    patch.content = String(body.slateContent)
  } else if (body.content !== undefined) {
    patch.content = textToSlate(String(body.content))
  }
  if (body.title !== undefined) patch.title = String(body.title)

  if (Object.keys(patch).length === 0) { err(res, 400, 'Provide content, slateContent, or title'); return }

  const updated = updateNote(id, patch)!
  _fwm!.pushUpdate(updated)
  pushMain(IPC.MAIN_NOTE_UPDATED, updated)
  ok(res, taggedPin(updated, 'note'))
}

async function handleUpdateNoteStruckKeys(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
  const body = await readBody(req) as any
  const note = getNoteById(id)
  if (!note) { err(res, 404, `Note "${id}" not found`); return }
  if (!Array.isArray(body.struckKeys)) { err(res, 400, 'struckKeys must be an array'); return }
  const updated = updateNote(id, { struckKeys: body.struckKeys })!
  _fwm!.pushUpdate(updated)
  pushMain(IPC.MAIN_NOTE_UPDATED, updated)
  ok(res, taggedPin(updated, 'note'))
}

async function handleReplacePhotoPinImage(req: IncomingMessage, res: ServerResponse, id: string): Promise<void> {
  const body = await readBody(req) as any
  if (!body.sourcePath) { err(res, 400, 'sourcePath is required'); return }
  const srcPath = String(body.sourcePath)
  const ext = extname(srcPath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    err(res, 400, `Unsupported image format "${ext}". Allowed: jpg, jpeg, png, gif, bmp, webp`); return
  }
  const pin = getPhotoPinById(id)
  if (!pin) { err(res, 404, `PhotoPin "${id}" not found`); return }

  const oldImagePath = pin.imagePath
  const newFileName = `${uuidv4()}${ext}`
  const newDestPath = join(getImagesDir(), newFileName)

  try {
    copyFileSync(srcPath, newDestPath)
  } catch (e) {
    err(res, 500, `Failed to copy image: ${String(e)}`); return
  }

  const updated = updatePhotoPin(id, { imagePath: newDestPath })!
  try { unlinkSync(oldImagePath) } catch { /* already gone */ }

  if (pin.status === 'posted') _fpm!.pushUpdate(updated)
  pushMain(IPC.MAIN_PHOTO_PIN_UPDATED, updated)
  ok(res, taggedPin(updated, 'photo'))
}

async function handlePostClipboardImage(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req) as any
  const image = clipboard.readImage()
  if (image.isEmpty()) {
    err(res, 400, 'No image in clipboard. Copy an image first, then call this tool.'); return
  }
  const tmpPath = join(tmpdir(), `note-pins-${uuidv4()}.png`)
  writeFileSync(tmpPath, image.toPNG())
  const partial: Partial<PhotoPin> = { status: 'posted' }
  if (body.title) partial.title = String(body.title)
  if (body.caption) partial.caption = String(body.caption)
  try {
    const pin = createPhotoPin(tmpPath, partial)
    _fpm!.openPin(pin)
    pushMain(IPC.MAIN_PHOTO_PIN_ADDED, pin)
    ok(res, taggedPin(pin, 'photo'))
  } finally {
    try { unlinkSync(tmpPath) } catch { /* already gone */ }
  }
}

async function handlePostPinToDesktop(res: ServerResponse, id: string): Promise<void> {
  const note = getNoteById(id)
  if (note) {
    const updated = note.status !== 'posted' ? updateNote(id, { status: 'posted' })! : note
    _fwm!.openNote(updated)
    pushMain(IPC.MAIN_NOTE_UPDATED, updated)
    ok(res, taggedPin(updated, 'note')); return
  }
  const pin = getPhotoPinById(id)
  if (pin) {
    const updated = pin.status !== 'posted' ? updatePhotoPin(id, { status: 'posted' })! : pin
    _fpm!.openPin(updated)
    pushMain(IPC.MAIN_PHOTO_PIN_UPDATED, updated)
    ok(res, taggedPin(updated, 'photo')); return
  }
  err(res, 404, `No pin found with id "${id}"`)
}

async function handleMovePinBack(res: ServerResponse, id: string): Promise<void> {
  const note = getNoteById(id)
  if (note) {
    if (note.status !== 'posted') { err(res, 409, 'Pin is not currently posted to the desktop'); return }
    _fwm!.closeNote(id)
    const updated = updateNote(id, { status: 'draft' })!
    pushMain(IPC.MAIN_NOTE_UPDATED, updated)
    ok(res, taggedPin(updated, 'note')); return
  }
  const pin = getPhotoPinById(id)
  if (pin) {
    if (pin.status !== 'posted') { err(res, 409, 'Pin is not currently posted to the desktop'); return }
    _fpm!.closePin(id)
    const updated = updatePhotoPin(id, { status: 'draft' })!
    pushMain(IPC.MAIN_PHOTO_PIN_UPDATED, updated)
    ok(res, taggedPin(updated, 'photo')); return
  }
  err(res, 404, `No pin found with id "${id}"`)
}

async function handleDeletePin(res: ServerResponse, id: string): Promise<void> {
  const note = getNoteById(id)
  if (note) {
    if (note.status === 'posted') _fwm!.closeNote(id)
    deleteNote(id)
    pushMain(IPC.MAIN_NOTE_DELETED, id)
    ok(res, { deleted: true, type: 'note', id }); return
  }
  const pin = getPhotoPinById(id)
  if (pin) {
    if (pin.status === 'posted') _fpm!.closePin(id)
    deletePhotoPin(id)
    pushMain(IPC.MAIN_PHOTO_PIN_DELETED, id)
    ok(res, { deleted: true, type: 'photo', id }); return
  }
  err(res, 404, `No pin found with id "${id}"`)
}

// ── Router ────────────────────────────────────────────────────────────────────

async function dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost`)
  const path = url.pathname
  const method = req.method ?? 'GET'

  try {
    if (method === 'GET' && path === '/health') return handleHealth(res)
    if (method === 'GET' && path === '/pins') return handleGetPins(res)

    let m: RegExpMatchArray | null

    m = path.match(/^\/pins\/([^/]+)$/)
    if (method === 'GET' && m) return handleGetPin(res, m[1])

    if (method === 'POST' && path === '/notes') return handleCreateNote(req, res)
    if (method === 'POST' && path === '/photo-pins') return handleCreatePhotoPin(req, res)
    if (method === 'POST' && path === '/photo-pins/from-clipboard') return handlePostClipboardImage(req, res)

    m = path.match(/^\/notes\/([^/]+)\/content$/)
    if (method === 'PATCH' && m) return handleUpdateNoteContent(req, res, m[1])

    m = path.match(/^\/notes\/([^/]+)\/struck-keys$/)
    if (method === 'PATCH' && m) return handleUpdateNoteStruckKeys(req, res, m[1])

    m = path.match(/^\/photo-pins\/([^/]+)\/image$/)
    if (method === 'PUT' && m) return handleReplacePhotoPinImage(req, res, m[1])

    m = path.match(/^\/pins\/([^/]+)\/post$/)
    if (method === 'POST' && m) return handlePostPinToDesktop(res, m[1])

    m = path.match(/^\/pins\/([^/]+)\/move-back$/)
    if (method === 'POST' && m) return handleMovePinBack(res, m[1])

    m = path.match(/^\/pins\/([^/]+)$/)
    if (method === 'DELETE' && m) return handleDeletePin(res, m[1])

    err(res, 404, `Unknown route: ${method} ${path}`)
  } catch (e: any) {
    if (e?.status) {
      err(res, e.status, e.error)
    } else {
      console.error('[bridge] unhandled error:', e)
      err(res, 500, String(e))
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startBridge(
  fwm: FloatingWindowManager,
  fpm: FloatingPhotoManager,
  mainWindow: BrowserWindow
): void {
  _fwm = fwm
  _fpm = fpm
  _mainWindow = mainWindow

  const port = parseInt(process.env['NOTE_PINS_BRIDGE_PORT'] ?? '47890', 10)
  server = createServer((req, res) => { dispatch(req, res) })
  server.listen(port, '127.0.0.1', () => {
    console.log(`[bridge] listening on 127.0.0.1:${port}`)
  })
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.warn(`[bridge] port ${port} in use — MCP tools unavailable`)
    } else {
      console.error('[bridge] server error:', e)
    }
  })

  // Spawn the MCP HTTP server alongside the bridge.
  // Dev: app.getAppPath() is the project root. Packaged: server is in extraResources → process.resourcesPath.
  const mcpServerPath = app.isPackaged
    ? join(process.resourcesPath, 'mcp-server', 'dist', 'server.js')
    : join(app.getAppPath(), 'mcp-server', 'dist', 'server.js')
  if (existsSync(mcpServerPath)) {
    mcpProcess = spawn('node', [mcpServerPath], {
      stdio: 'ignore',
      env: { ...process.env, NOTE_PINS_HTTP_MODE: '1', NOTE_PINS_BRIDGE_PORT: String(port), NOTE_PINS_MCP_PORT: '3001' },
    })
    mcpProcess.on('error', (e) => console.warn('[mcp-http] failed to start:', e.message))
    mcpProcess.on('exit', (code) => { if (code !== 0 && code !== null) console.warn(`[mcp-http] exited with code ${code}`) })
    console.log('[mcp-http] spawned, connector URL → http://127.0.0.1:3001/mcp')
  } else {
    console.warn('[mcp-http] server not found at', mcpServerPath, '— build mcp-server/ first')
  }

  // Spawn ngrok so the Claude.ai connector stays live without a manual terminal.
  // Uses the static free domain so the connector URL never changes.
  const ngrokPath = join(process.env['LOCALAPPDATA'] ?? '', 'ngrok', 'ngrok.exe')
  if (existsSync(ngrokPath)) {
    ngrokProcess = spawn(ngrokPath, ['http', '3001', '--domain=lather-ninth-kleenex.ngrok-free.dev'], {
      stdio: 'ignore',
    })
    ngrokProcess.on('error', (e) => console.warn('[ngrok] failed to start:', e.message))
    ngrokProcess.on('exit', (code) => { if (code !== 0 && code !== null) console.warn(`[ngrok] exited with code ${code}`) })
    console.log('[ngrok] spawned → https://lather-ninth-kleenex.ngrok-free.dev/mcp')
  } else {
    console.warn('[ngrok] not found at', ngrokPath, '— Claude.ai connector unavailable')
  }
}

export function stopBridge(): void {
  ngrokProcess?.kill()
  ngrokProcess = null
  mcpProcess?.kill()
  mcpProcess = null
  server?.close()
  server = null
}
