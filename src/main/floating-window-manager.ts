import { BrowserWindow, Menu, dialog, BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { Note } from '../shared/types'
import { IPC } from '../shared/ipc-channels'
import { THEMES } from '../shared/themes'
import {
  getNoteById,
  updateNote,
  deleteNote,
  duplicateNote,
} from './db'
import { sinkWindow } from './win32'

export class FloatingWindowManager {
  private windows = new Map<string, BrowserWindow>()
  private mainWindow: BrowserWindow

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  openNote(note: Note): void {
    if (this.windows.has(note.id)) {
      this.windows.get(note.id)!.focus()
      return
    }
    const win = this.createWindow(note)
    this.windows.set(note.id, win)
    win.on('closed', () => this.windows.delete(note.id))
  }

  closeNote(noteId: string): void {
    const win = this.windows.get(noteId)
    if (win && !win.isDestroyed()) win.destroy()
    this.windows.delete(noteId)
  }

  closeAll(): void {
    for (const [, win] of this.windows) {
      if (!win.isDestroyed()) win.destroy()
    }
    this.windows.clear()
  }

  pushUpdate(note: Note): void {
    const win = this.windows.get(note.id)
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.MAIN_NOTE_UPDATED, note)
    }
  }

  isOpen(noteId: string): boolean {
    return this.windows.has(noteId)
  }

  getWindow(noteId: string): BrowserWindow | undefined {
    return this.windows.get(noteId)
  }

  triggerContextMenu(noteId: string): void {
    const win = this.windows.get(noteId)
    if (!win || win.isDestroyed()) return
    const note = getNoteById(noteId)
    if (!note) return
    this.showContextMenu(win, noteId, note)
  }

  restorePostedNotes(notes: Note[]): void {
    for (const note of notes) {
      if (note.status === 'posted') this.openNote(note)
    }
  }

  private createWindow(note: Note): BrowserWindow {
    const platformOpts = this.getPlatformOpts()

    const win = new BrowserWindow({
      x: note.x,
      y: note.y,
      width: note.width,
      height: note.height,
      minWidth: 160,
      minHeight: 100,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: !note.isLocked,
      // skipTaskbar keeps notes off the Windows taskbar
      skipTaskbar: true,
      // Do NOT use alwaysOnTop by default — notes sit behind normal app windows
      alwaysOnTop: note.isAlwaysOnTop,
      // focusable must be true for context menu and interaction
      focusable: true,
      show: false,
      ...platformOpts,
      webPreferences: {
        preload: join(__dirname, '../preload/note-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        backgroundThrottling: true,
        additionalArguments: ['--js-flags=--max-old-space-size=64'],
      },
    })

    // macOS: place window at desktop-icon level (below normal windows)
    if (process.platform === 'darwin') {
      win.setAlwaysOnTop(note.isAlwaysOnTop, note.isAlwaysOnTop ? 'floating' : 'desktop-icon')
    }

    const noteId = note.id

    // ── Position & size persistence (main process events — more reliable than renderer IPC) ──
    let moveTimer: ReturnType<typeof setTimeout>
    win.on('moved', () => {
      clearTimeout(moveTimer)
      moveTimer = setTimeout(() => {
        if (win.isDestroyed()) return
        const [x, y] = win.getPosition()
        updateNote(noteId, { x, y })
      }, 200)
    })

    let resizeTimer: ReturnType<typeof setTimeout>
    win.on('resized', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (win.isDestroyed()) return
        const [width, height] = win.getSize()
        const [x, y] = win.getPosition()
        updateNote(noteId, { width, height, x, y })
      }, 200)
    })

    // ── Show without stealing focus; sink to desktop layer on Windows ────────
    win.once('ready-to-show', () => {
      win.showInactive()
      if (sinkWindow) sinkWindow(win.getNativeWindowHandle())
    })

    // Re-sink if the window somehow comes to front (e.g. alt-tab, taskbar click)
    win.on('focus', () => {
      if (sinkWindow) sinkWindow(win.getNativeWindowHandle())
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/note-window.html?noteId=${noteId}`)
    } else {
      win.loadFile(join(__dirname, '../renderer/note-window.html'), { query: { noteId } })
    }

    return win
  }

  private getPlatformOpts(): Partial<BrowserWindowConstructorOptions> {
    switch (process.platform) {
      case 'linux':
        // type:'desktop' floats above wallpaper & icons, below normal windows
        return { type: 'desktop' } as Partial<BrowserWindowConstructorOptions>
      case 'darwin':
        // Level set post-creation via setAlwaysOnTop above
        return {}
      case 'win32':
        // Windows has no native "desktop widget" z-layer without Win32 native calls.
        // showInactive() + refocusing the main window keeps notes below running apps
        // on initial creation. Once the user clicks another app, notes go behind naturally.
        return {}
      default:
        return {}
    }
  }

  private showContextMenu(win: BrowserWindow, noteId: string, note: Note): void {
    const fwm = this

    const menu = Menu.buildFromTemplate([
      {
        label: 'Edit in App',
        click: () => {
          if (!this.mainWindow.isDestroyed()) {
            this.mainWindow.focus()
            this.mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, note)
            this.mainWindow.webContents.send(IPC.MAIN_SELECT_NOTE, note.id)
          }
        },
      },
      {
        label: 'Move Back to App',
        click: () => {
          fwm.closeNote(noteId)
          const updated = updateNote(noteId, { status: 'draft' })
          if (updated && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, updated)
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Remove from Desktop',
        click: () => {
          fwm.closeNote(noteId)
          const updated = updateNote(noteId, { status: 'hidden' })
          if (updated && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, updated)
          }
        },
      },
      {
        label: 'Delete Permanently',
        click: async () => {
          const { response } = await dialog.showMessageBox(this.mainWindow, {
            type: 'warning',
            message: 'Delete this note permanently?',
            detail: 'This cannot be undone.',
            buttons: ['Cancel', 'Delete'],
            defaultId: 0,
            cancelId: 0,
          })
          if (response === 1) {
            fwm.closeNote(noteId)
            deleteNote(noteId)
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send(IPC.MAIN_NOTE_DELETED, noteId)
            }
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Duplicate',
        click: () => {
          const copy = duplicateNote(noteId)
          if (copy && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC.MAIN_NOTE_ADDED, copy)
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Change Theme',
        submenu: THEMES.map((t) => ({
          label: t.label,
          click: () => {
            const updated = updateNote(noteId, {
              theme: t.id,
              backgroundColor: t.backgroundColor,
            })
            if (updated) {
              fwm.pushUpdate(updated)
              if (!this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, updated)
              }
            }
          },
        })),
      },
      { type: 'separator' },
      {
        label: note.isAlwaysOnTop ? 'Unpin from Top' : 'Pin Above Apps',
        click: () => {
          const value = !note.isAlwaysOnTop
          const floatWin = fwm.getWindow(noteId)
          if (floatWin && !floatWin.isDestroyed()) {
            if (process.platform === 'darwin') {
              floatWin.setAlwaysOnTop(value, value ? 'floating' : 'desktop-icon')
            } else {
              floatWin.setAlwaysOnTop(value)
            }
          }
          const updated = updateNote(noteId, { isAlwaysOnTop: value })
          if (updated) {
            fwm.pushUpdate(updated)
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, updated)
            }
          }
        },
      },
      {
        label: note.isLocked ? 'Unlock Position' : 'Lock Position',
        click: () => {
          const value = !note.isLocked
          const floatWin = fwm.getWindow(noteId)
          if (floatWin && !floatWin.isDestroyed()) {
            floatWin.setResizable(!value)
          }
          const updated = updateNote(noteId, { isLocked: value })
          if (updated) {
            fwm.pushUpdate(updated)
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send(IPC.MAIN_NOTE_UPDATED, updated)
            }
          }
        },
      },
    ])

    menu.popup({ window: win })
  }
}
