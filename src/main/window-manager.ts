import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function createMainWindow(showOnReady = true): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 860,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Note Pins',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: join(__dirname, '../preload/main-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: true,
      additionalArguments: ['--js-flags=--max-old-space-size=128'],
    },
  })

  win.on('ready-to-show', () => { if (showOnReady) win.show() })

  // Hide to tray instead of closing so the app keeps running and tray stays active
  win.on('close', (e) => { e.preventDefault(); win.hide() })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
