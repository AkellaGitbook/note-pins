import { app } from 'electron'
import { readFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync, statSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join, dirname, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Note, PhotoPin, DbSchema } from '../shared/types'

const DEFAULT_CONTENT = JSON.stringify([
  { type: 'paragraph', children: [{ text: '' }] },
])

let dbPath: string
let imagesDir: string
let db: DbSchema = { notes: [], photoPins: [] }

// ── Async write queue — coalesces rapid saves, never writes out-of-order ──────
// pendingSnapshot holds the data for the next write; null means no write pending.
// flushChain is a promise that resolves only after ALL pending writes complete.
let flushChain: Promise<void> = Promise.resolve()
let pendingSnapshot: string | null = null

function flush(): void {
  const snapshot = JSON.stringify(db, null, 2)
  if (pendingSnapshot !== null) {
    // A write is already queued — coalesce by updating the pending data.
    pendingSnapshot = snapshot
    return
  }
  pendingSnapshot = snapshot
  flushChain = flushChain.then(async () => {
    const toWrite = pendingSnapshot!
    pendingSnapshot = null
    await writeFile(dbPath, toWrite, 'utf-8')
  })
}

export function waitForFlush(): Promise<void> {
  return flushChain
}

export function getImagesDir(): string {
  return imagesDir
}

export type DbCorruptionInfo = {
  recoveredFromBackup: boolean
  backupDate: Date | null
  noteCount: number
}

function applyMigrations(): boolean {
  let migrated = false
  for (const note of db.notes as any[]) {
    if ('struckSentences' in note && !note.struckKeys) {
      note.struckKeys = []
      delete note.struckSentences
      migrated = true
    }
  }
  // status migration: 'draft'|'hidden' → 'unposted'
  for (const note of db.notes as any[]) {
    if (note.status === 'draft' || note.status === 'hidden') {
      note.status = 'unposted'
      migrated = true
    }
  }
  if (!db.photoPins) {
    db.photoPins = []
    migrated = true
  }
  for (const pin of db.photoPins as any[]) {
    if (pin.status === 'draft') {
      pin.status = 'unposted'
      migrated = true
    }
  }
  return migrated
}

// Returns null on clean startup; returns info when the main file was corrupt.
export function initDb(): DbCorruptionInfo | null {
  dbPath = join(app.getPath('userData'), 'sticky-notes.json')
  imagesDir = join(app.getPath('userData'), 'images')
  const dir = dirname(dbPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  mkdirSync(imagesDir, { recursive: true })

  if (existsSync(dbPath)) {
    try {
      db = JSON.parse(readFileSync(dbPath, 'utf-8'))
      // rotating backup — sync is fine at startup
      copyFileSync(dbPath, dbPath + '.bak')
      if (applyMigrations()) flush()
      return null
    } catch {
      // Main file is corrupt — attempt recovery from backup
      const bakPath = dbPath + '.bak'
      if (existsSync(bakPath)) {
        try {
          db = JSON.parse(readFileSync(bakPath, 'utf-8'))
          const backupDate = statSync(bakPath).mtime
          if (applyMigrations()) flush()
          // Write the restored data back to the main file
          flush()
          return { recoveredFromBackup: true, backupDate, noteCount: db.notes.length }
        } catch {
          // Backup also corrupt — start fresh
        }
      }
      db = { notes: [], photoPins: [] }
      return { recoveredFromBackup: false, backupDate: null, noteCount: 0 }
    }
  } else {
    db = { notes: [], photoPins: [] }
    flush()
    return null
  }
}

function makeNote(partial: Partial<Note> = {}): Note {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    title: 'New Note',
    content: DEFAULT_CONTENT,
    createdAt: now,
    updatedAt: now,
    status: 'unposted',
    x: 120 + Math.floor(Math.random() * 160),
    y: 120 + Math.floor(Math.random() * 160),
    width: 280,
    height: 320,
    fontFamily: 'Comic Sans MS, cursive',
    titleFontSize: 16,
    contentFontSize: 13,
    fontWeight: 400,
    lineHeight: 1.5,
    textAlign: 'left',
    backgroundColor: '#fef3c7',
    theme: 'yellow',
    opacity: 1,
    borderRadius: 8,
    shadowLevel: 2,
    isAlwaysOnTop: false,
    isLocked: false,
    tags: [],
    struckKeys: [],
    ...partial,
  }
}

export function getAllNotes(): Note[] {
  return db.notes
}

export function getNoteById(id: string): Note | undefined {
  return db.notes.find((n) => n.id === id)
}

export function getNotesByStatus(status: Note['status']): Note[] {
  return db.notes.filter((n) => n.status === status)
}

export function createNote(partial: Partial<Note> = {}): Note {
  const note = makeNote(partial)
  db.notes.unshift(note)
  flush()
  return note
}

export function updateNote(id: string, patch: Partial<Note>): Note | null {
  const idx = db.notes.findIndex((n) => n.id === id)
  if (idx === -1) return null
  db.notes[idx] = { ...db.notes[idx], ...patch, updatedAt: new Date().toISOString() }
  flush()
  return db.notes[idx]
}

export function deleteNote(id: string): boolean {
  const idx = db.notes.findIndex((n) => n.id === id)
  if (idx === -1) return false
  db.notes.splice(idx, 1)
  flush()
  return true
}

export function duplicateNote(id: string): Note | null {
  const src = getNoteById(id)
  if (!src) return null
  const now = new Date().toISOString()
  const copy = makeNote({
    ...src,
    id: uuidv4(),
    title: `${src.title} (copy)`,
    status: 'unposted',
    createdAt: now,
    updatedAt: now,
    x: src.x + 24,
    y: src.y + 24,
  })
  db.notes.unshift(copy)
  flush()
  return copy
}

export function searchNotes(query: string): Note[] {
  if (!query.trim()) return db.notes
  const q = query.toLowerCase()
  return db.notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
  )
}

// ── Photo Pins ────────────────────────────────────────────────────────────────

function makePhotoPin(sourceImagePath: string, partial: Partial<PhotoPin> = {}): PhotoPin {
  const id = uuidv4()
  const ext = extname(sourceImagePath) || '.jpg'
  const dest = join(imagesDir, `${id}${ext}`)
  copyFileSync(sourceImagePath, dest)

  const now = new Date().toISOString()
  return {
    id,
    imagePath: dest,
    title: '',
    caption: '',
    createdAt: now,
    updatedAt: now,
    status: 'unposted',
    x: 200 + Math.floor(Math.random() * 160),
    y: 200 + Math.floor(Math.random() * 160),
    width: 260,
    height: 310,
    rotation: parseFloat((Math.random() * 8 - 4).toFixed(2)),
    opacity: 1,
    shadowLevel: 3,
    isLocked: false,
    isAlwaysOnTop: false,
    ...partial,
  }
}

export function getAllPhotoPins(): PhotoPin[] {
  return db.photoPins
}

export function getPhotoPinById(id: string): PhotoPin | undefined {
  return db.photoPins.find((p) => p.id === id)
}

export function createPhotoPin(sourceImagePath: string, partial: Partial<PhotoPin> = {}): PhotoPin {
  const pin = makePhotoPin(sourceImagePath, partial)
  db.photoPins.unshift(pin)
  flush()
  return pin
}

export function updatePhotoPin(id: string, patch: Partial<PhotoPin>): PhotoPin | null {
  const idx = db.photoPins.findIndex((p) => p.id === id)
  if (idx === -1) return null
  db.photoPins[idx] = { ...db.photoPins[idx], ...patch, updatedAt: new Date().toISOString() }
  flush()
  return db.photoPins[idx]
}

export function deletePhotoPin(id: string): boolean {
  const idx = db.photoPins.findIndex((p) => p.id === id)
  if (idx === -1) return false
  const [pin] = db.photoPins.splice(idx, 1)
  flush()
  try { unlinkSync(pin.imagePath) } catch { /* file already gone */ }
  return true
}
