import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import path from 'path'
import fs from 'fs'

// Mock electron before importing db
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(),
  },
}))

import { app } from 'electron'
import {
  initDb,
  waitForFlush,
  getAllNotes,
  createNote,
  updateNote,
  deleteNote,
  duplicateNote,
  searchNotes,
  createPhotoPin,
  deletePhotoPin,
} from './db'

const mockedGetPath = vi.mocked(app.getPath)

let testDir: string
let dbPath: string

beforeEach(() => {
  testDir = path.join(os.tmpdir(), `db-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  fs.mkdirSync(testDir, { recursive: true })
  mockedGetPath.mockReturnValue(testDir)
  dbPath = path.join(testDir, 'sticky-notes.json')
})

afterEach(async () => {
  await waitForFlush()
  fs.rmSync(testDir, { recursive: true, force: true })
})

describe('initDb', () => {
  it('creates the JSON file and images/ dir when they do not exist', async () => {
    initDb()
    await waitForFlush()
    expect(fs.existsSync(dbPath)).toBe(true)
    expect(fs.existsSync(path.join(testDir, 'images'))).toBe(true)
  })

  it('migrates a DB missing photoPins by adding the empty array', async () => {
    fs.writeFileSync(dbPath, JSON.stringify({ notes: [] }), 'utf-8')
    initDb()
    await waitForFlush()
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    expect(Array.isArray(data.photoPins)).toBe(true)
  })

  it('falls back to empty state on corrupt JSON without throwing', () => {
    fs.writeFileSync(dbPath, 'NOT VALID JSON', 'utf-8')
    expect(() => initDb()).not.toThrow()
    expect(getAllNotes()).toEqual([])
  })

  it('writes a .bak of a valid existing file', () => {
    const initial = JSON.stringify({ notes: [], photoPins: [] }, null, 2)
    fs.writeFileSync(dbPath, initial, 'utf-8')
    initDb()
    expect(fs.existsSync(dbPath + '.bak')).toBe(true)
    expect(fs.readFileSync(dbPath + '.bak', 'utf-8')).toBe(initial)
  })
})

describe('createNote', () => {
  beforeEach(() => initDb())

  it('returns a note with all required fields and persists it', async () => {
    const note = createNote({ title: 'Test' })
    await waitForFlush()
    expect(note.id).toBeTruthy()
    expect(note.title).toBe('Test')
    expect(note.content).toBeTruthy()
    expect(note.status).toBe('draft')
    expect(note.tags).toEqual([])
    expect(note.struckKeys).toEqual([])

    const persisted = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    expect(persisted.notes.find((n: any) => n.id === note.id)).toBeTruthy()
  })
})

describe('updateNote', () => {
  beforeEach(() => initDb())

  it('returns the updated note and persists the change', async () => {
    const note = createNote()
    const updated = updateNote(note.id, { title: 'Updated' })
    await waitForFlush()
    expect(updated).not.toBeNull()
    expect(updated!.title).toBe('Updated')

    const persisted = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    expect(persisted.notes.find((n: any) => n.id === note.id).title).toBe('Updated')
  })

  it('returns null for an unknown id', () => {
    const result = updateNote('does-not-exist', { title: 'x' })
    expect(result).toBeNull()
  })
})

describe('deleteNote', () => {
  beforeEach(() => initDb())

  it('removes the note and returns true', async () => {
    const note = createNote()
    const ok = deleteNote(note.id)
    await waitForFlush()
    expect(ok).toBe(true)
    const persisted = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    expect(persisted.notes.find((n: any) => n.id === note.id)).toBeUndefined()
  })

  it('returns false for an unknown id', () => {
    expect(deleteNote('ghost')).toBe(false)
  })
})

describe('duplicateNote', () => {
  beforeEach(() => initDb())

  it('produces a new id and appends (copy) to the title', () => {
    const note = createNote({ title: 'Original' })
    const copy = duplicateNote(note.id)
    expect(copy).not.toBeNull()
    expect(copy!.id).not.toBe(note.id)
    expect(copy!.title).toBe('Original (copy)')
  })
})

describe('searchNotes', () => {
  beforeEach(() => {
    initDb()
    createNote({ title: 'Alpha', tags: ['work'] })
    createNote({ title: 'Beta', content: JSON.stringify([{ type: 'paragraph', children: [{ text: 'hello world' }] }]) })
  })

  it('returns all notes on empty query', () => {
    expect(searchNotes('').length).toBe(2)
  })

  it('matches by title', () => {
    const results = searchNotes('alpha')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Alpha')
  })

  it('matches by content', () => {
    const results = searchNotes('hello')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Beta')
  })

  it('matches by tag', () => {
    const results = searchNotes('work')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Alpha')
  })
})

describe('createPhotoPin', () => {
  let srcImage: string

  beforeEach(() => {
    initDb()
    srcImage = path.join(testDir, 'source.jpg')
    fs.writeFileSync(srcImage, 'fake-image-data')
  })

  it('copies the source image into imagesDir', async () => {
    const pin = createPhotoPin(srcImage)
    await waitForFlush()
    expect(fs.existsSync(pin.imagePath)).toBe(true)
    expect(pin.imagePath).toContain(path.join(testDir, 'images'))
    expect(fs.readFileSync(pin.imagePath, 'utf-8')).toBe('fake-image-data')
  })
})

describe('deletePhotoPin', () => {
  let srcImage: string

  beforeEach(() => {
    initDb()
    srcImage = path.join(testDir, 'source.png')
    fs.writeFileSync(srcImage, 'img')
  })

  it('removes the copied image file from disk', async () => {
    const pin = createPhotoPin(srcImage)
    const copiedPath = pin.imagePath
    expect(fs.existsSync(copiedPath)).toBe(true)

    deletePhotoPin(pin.id)
    await waitForFlush()
    expect(fs.existsSync(copiedPath)).toBe(false)
  })
})
