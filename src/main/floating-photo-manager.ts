import { BrowserWindow, Menu, dialog, BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { PhotoPin } from '../shared/types'
import { IPC } from '../shared/ipc-channels'
import { getPhotoPinById, updatePhotoPin, deletePhotoPin } from './db'
import { sinkWindow } from './win32'

export class FloatingPhotoManager {
  private windows = new Map<string, BrowserWindow>()
  private mainWindow: BrowserWindow

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  openPin(pin: PhotoPin): void {
    if (this.windows.has(pin.id)) {
      this.windows.get(pin.id)!.focus()
      return
    }
    const win = this.createWindow(pin)
    this.windows.set(pin.id, win)
    win.on('closed', () => this.windows.delete(pin.id))
  }

  closePin(pinId: string): void {
    const win = this.windows.get(pinId)
    if (win && !win.isDestroyed()) win.destroy()
    this.windows.delete(pinId)
  }

  closeAll(): void {
    for (const [, win] of this.windows) {
      if (!win.isDestroyed()) win.destroy()
    }
    this.windows.clear()
  }

  pushUpdate(pin: PhotoPin): void {
    const win = this.windows.get(pin.id)
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.MAIN_PHOTO_PIN_UPDATED, pin)
    }
  }

  isOpen(pinId: string): boolean {
    return this.windows.has(pinId)
  }

  getWindow(pinId: string): BrowserWindow | undefined {
    return this.windows.get(pinId)
  }

  triggerContextMenu(pinId: string): void {
    const win = this.windows.get(pinId)
    if (!win || win.isDestroyed()) return
    const pin = getPhotoPinById(pinId)
    if (!pin) return
    this.showContextMenu(win, pinId, pin)
  }

  restorePostedPhotoPins(pins: PhotoPin[]): void {
    for (const pin of pins) {
      if (pin.status === 'posted') this.openPin(pin)
    }
  }

  private createWindow(pin: PhotoPin): BrowserWindow {
    const platformOpts = this.getPlatformOpts()

    const win = new BrowserWindow({
      x: pin.x,
      y: pin.y,
      width: pin.width,
      height: pin.height,
      minWidth: 160,
      minHeight: 200,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: !pin.isLocked,
      skipTaskbar: true,
      alwaysOnTop: pin.isAlwaysOnTop,
      focusable: true,
      show: false,
      ...platformOpts,
      webPreferences: {
        preload: join(__dirname, '../preload/photo-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    })

    if (process.platform === 'darwin') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      win.setAlwaysOnTop(pin.isAlwaysOnTop, (pin.isAlwaysOnTop ? 'floating' : 'desktop-icon') as any)
    }

    const pinId = pin.id

    let moveTimer: ReturnType<typeof setTimeout>
    win.on('moved', () => {
      clearTimeout(moveTimer)
      moveTimer = setTimeout(() => {
        if (win.isDestroyed()) return
        const [x, y] = win.getPosition()
        updatePhotoPin(pinId, { x, y })
      }, 200)
    })

    let resizeTimer: ReturnType<typeof setTimeout>
    win.on('resized', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (win.isDestroyed()) return
        const [width, height] = win.getSize()
        const [x, y] = win.getPosition()
        updatePhotoPin(pinId, { width, height, x, y })
      }, 200)
    })

    win.once('ready-to-show', () => {
      win.showInactive()
      if (sinkWindow) sinkWindow(win.getNativeWindowHandle())
    })

    win.on('focus', () => {
      if (sinkWindow) sinkWindow(win.getNativeWindowHandle())
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?photoId=${pinId}`)
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'), { query: { photoId: pinId } })
    }

    return win
  }

  private getPlatformOpts(): Partial<BrowserWindowConstructorOptions> {
    switch (process.platform) {
      case 'linux':
        return { type: 'desktop' } as Partial<BrowserWindowConstructorOptions>
      default:
        return {}
    }
  }

  private showContextMenu(win: BrowserWindow, pinId: string, pin: PhotoPin): void {
    const fpm = this

    const menu = Menu.buildFromTemplate([
      {
        label: 'Move Back to App',
        click: () => {
          fpm.closePin(pinId)
          const updated = updatePhotoPin(pinId, { status: 'draft' })
          if (updated && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_UPDATED, updated)
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Delete Permanently',
        click: async () => {
          const { response } = await dialog.showMessageBox(this.mainWindow, {
            type: 'warning',
            message: 'Delete this photo permanently?',
            detail: 'This cannot be undone.',
            buttons: ['Cancel', 'Delete'],
            defaultId: 0,
            cancelId: 0,
          })
          if (response === 1) {
            fpm.closePin(pinId)
            deletePhotoPin(pinId)
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_DELETED, pinId)
            }
          }
        },
      },
      { type: 'separator' },
      {
        label: pin.isAlwaysOnTop ? 'Unpin from Top' : 'Pin Above Apps',
        click: () => {
          const value = !pin.isAlwaysOnTop
          const floatWin = fpm.getWindow(pinId)
          if (floatWin && !floatWin.isDestroyed()) {
            if (process.platform === 'darwin') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              floatWin.setAlwaysOnTop(value, (value ? 'floating' : 'desktop-icon') as any)
            } else {
              floatWin.setAlwaysOnTop(value)
            }
          }
          const updated = updatePhotoPin(pinId, { isAlwaysOnTop: value })
          if (updated) {
            fpm.pushUpdate(updated)
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_UPDATED, updated)
            }
          }
        },
      },
      {
        label: pin.isLocked ? 'Unlock Position' : 'Lock Position',
        click: () => {
          const value = !pin.isLocked
          const floatWin = fpm.getWindow(pinId)
          if (floatWin && !floatWin.isDestroyed()) {
            floatWin.setResizable(!value)
          }
          const updated = updatePhotoPin(pinId, { isLocked: value })
          if (updated) {
            fpm.pushUpdate(updated)
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send(IPC.MAIN_PHOTO_PIN_UPDATED, updated)
            }
          }
        },
      },
    ])

    menu.popup({ window: win })
  }
}
