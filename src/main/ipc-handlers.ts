import { ipcMain, dialog, BrowserWindow, screen } from 'electron'
import { extname } from 'path'
import { IPC } from '../shared/ipc-channels'
import type { Note, PhotoPin } from '../shared/types'
import * as db from './db'

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'])
import type { FloatingWindowManager } from './floating-window-manager'
import type { FloatingPhotoManager } from './floating-photo-manager'

export function registerIpcHandlers(
  fwm: FloatingWindowManager,
  fpm: FloatingPhotoManager,
  mainWindow: BrowserWindow
): void {
  // ── CRUD ──────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.NOTES_GET_ALL, () => db.getAllNotes())

  ipcMain.handle(IPC.NOTES_GET_ONE, (_e, id: string) => db.getNoteById(id) ?? null)

  ipcMain.handle(IPC.NOTES_CREATE, (_e, partial: Partial<Note> = {}) => {
    if (partial.x === undefined || partial.y === undefined) {
      const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
      partial = {
        x: workArea.x + Math.round((workArea.width - 280) / 2) + Math.floor(Math.random() * 100 - 50),
        y: workArea.y + Math.round((workArea.height - 320) / 2) + Math.floor(Math.random() * 100 - 50),
        ...partial,
      }
    }
    const note = db.createNote(partial)
    mainWindow.webContents.send(IPC.MAIN_NOTE_ADDED, note)
    return note
  })

  ipcMain.handle(IPC.NOTES_UPDATE, (_e, id: string, patch: Partial<Note>) => {
    const note = db.updateNote(id, patch)
    if (note) {
      mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, note)
      fwm.pushUpdate(note)
    }
    return note
  })

  ipcMain.handle(IPC.NOTES_DELETE, async (_e, id: string) => {
    const ok = db.deleteNote(id)
    if (ok) {
      fwm.closeNote(id)
      mainWindow.webContents.send(IPC.MAIN_NOTE_DELETED, id)
    }
    return ok
  })

  ipcMain.handle(IPC.NOTES_DUPLICATE, (_e, id: string) => {
    const copy = db.duplicateNote(id)
    if (copy) mainWindow.webContents.send(IPC.MAIN_NOTE_ADDED, copy)
    return copy
  })

  ipcMain.handle(IPC.NOTES_SEARCH, (_e, query: string) => db.searchNotes(query))

  // ── LIFECYCLE ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.NOTE_POST, (_e, id: string) => {
    const note = db.updateNote(id, { status: 'posted' })
    if (note) {
      mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, note)
      fwm.openNote(note)
    }
    return note
  })

  ipcMain.handle(IPC.NOTE_MOVE_BACK, (_e, id: string) => {
    fwm.closeNote(id)
    const note = db.updateNote(id, { status: 'unposted' })
    if (note) mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, note)
    return note
  })

  // ── STYLE (from main window editor) ──────────────────────────────────────
  ipcMain.handle(IPC.NOTE_UPDATE_STYLE, (_e, id: string, patch: Partial<Note>) => {
    const note = db.updateNote(id, patch)
    if (note) {
      mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, note)
      fwm.pushUpdate(note)
    }
    return note
  })

  // ── ALWAYS-ON-TOP (from main window editor toggle) ────────────────────────
  ipcMain.handle(IPC.FLOAT_SET_ALWAYS_ON_TOP, (_e, id: string, value: boolean) => {
    const win = fwm.getWindow(id)
    if (win && !win.isDestroyed()) {
      if (process.platform === 'darwin') {
        win.setAlwaysOnTop(value, value ? 'floating' : 'desktop-icon')
      } else {
        win.setAlwaysOnTop(value)
      }
    }
    db.updateNote(id, { isAlwaysOnTop: value })
  })

  // ── CONTEXT MENU (triggered from renderer right-click) ────────────────────
  ipcMain.handle(IPC.FLOAT_CONTEXT_MENU, (_e, id: string) => {
    fwm.triggerContextMenu(id)
  })

  // ── CONFIRM DIALOG ────────────────────────────────────────────────────────
  ipcMain.handle(IPC.DIALOG_CONFIRM, async (_e, message: string, detail?: string) => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      message,
      detail,
      buttons: ['Cancel', 'OK'],
      defaultId: 1,
      cancelId: 0,
    })
    return response === 1
  })

  // ── PHOTO PINS CRUD ───────────────────────────────────────────────────────────
  ipcMain.handle(IPC.PHOTO_PINS_GET_ALL, () => db.getAllPhotoPins())

  ipcMain.handle(IPC.PHOTO_PINS_GET_ONE, (_e, id: string) => db.getPhotoPinById(id) ?? null)

  ipcMain.handle(IPC.PHOTO_PINS_CREATE, (_e, sourcePath: string) => {
    if (typeof sourcePath !== 'string' || !ALLOWED_IMAGE_EXTENSIONS.has(extname(sourcePath).toLowerCase())) {
      return null
    }
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const pin = db.createPhotoPin(sourcePath, {
      x: workArea.x + Math.round((workArea.width - 260) / 2) + Math.floor(Math.random() * 100 - 50),
      y: workArea.y + Math.round((workArea.height - 310) / 2) + Math.floor(Math.random() * 100 - 50),
    })
    mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_ADDED, pin)
    return pin
  })

  ipcMain.handle(IPC.PHOTO_PINS_UPDATE, (_e, id: string, patch: Partial<PhotoPin>) => {
    const pin = db.updatePhotoPin(id, patch)
    if (pin) {
      mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_UPDATED, pin)
      fpm.pushUpdate(pin)
    }
    return pin
  })

  ipcMain.handle(IPC.PHOTO_PINS_DELETE, (_e, id: string) => {
    const ok = db.deletePhotoPin(id)
    if (ok) {
      fpm.closePin(id)
      mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_DELETED, id)
    }
    return ok
  })

  ipcMain.handle(IPC.PHOTO_PIN_POST, (_e, id: string) => {
    const pin = db.updatePhotoPin(id, { status: 'posted' })
    if (pin) {
      fpm.openPin(pin)
      mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_UPDATED, pin)
    }
    return pin
  })

  ipcMain.handle(IPC.PHOTO_PIN_MOVE_BACK, (_e, id: string) => {
    fpm.closePin(id)
    const pin = db.updatePhotoPin(id, { status: 'unposted' })
    if (pin) mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_UPDATED, pin)
    return pin
  })

  ipcMain.handle(IPC.PHOTO_PIN_UPDATE_STYLE, (_e, id: string, patch: Partial<PhotoPin>) => {
    const pin = db.updatePhotoPin(id, patch)
    if (pin) {
      mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_UPDATED, pin)
      fpm.pushUpdate(pin)
    }
    return pin
  })

  ipcMain.handle(IPC.PHOTO_PINS_PICK_FILE, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select an image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }],
      properties: ['openFile'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.FLOAT_PHOTO_CONTEXT_MENU, (_e, id: string) => {
    fpm.triggerContextMenu(id)
  })

  ipcMain.handle(IPC.FLOAT_PHOTO_SET_ALWAYS_ON_TOP, (_e, id: string, value: boolean) => {
    const win = fpm.getWindow(id)
    if (win && !win.isDestroyed()) {
      if (process.platform === 'darwin') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        win.setAlwaysOnTop(value, (value ? 'floating' : 'desktop-icon') as any)
      } else {
        win.setAlwaysOnTop(value)
      }
    }
    db.updatePhotoPin(id, { isAlwaysOnTop: value })
  })
}
