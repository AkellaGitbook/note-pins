import { app, BrowserWindow, Tray, Menu, dialog, protocol, net } from 'electron'
import { join, basename } from 'path'
import { pathToFileURL } from 'url'
import { writeFile } from 'fs/promises'
import { initDb, getAllNotes, getAllPhotoPins } from './db'
import { createMainWindow } from './window-manager'
import { FloatingWindowManager } from './floating-window-manager'
import { FloatingPhotoManager } from './floating-photo-manager'
import { registerIpcHandlers } from './ipc-handlers'
import { startBridge, stopBridge } from './http-bridge'

app.setName('Note Pins')
app.disableHardwareAcceleration()

// Must be called before app.whenReady() — tells Chromium to route app-image://
// requests to our protocol handler instead of silently dropping them.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app-image', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } },
])

// Detect login-item start (launched by Windows on boot with --hidden flag)
const isHiddenStart = process.argv.includes('--hidden')

let mainWindow: BrowserWindow | null = null
let fwm: FloatingWindowManager | null = null
let fpm: FloatingPhotoManager | null = null
let tray: Tray | null = null

// ── Slate → Markdown text extraction (for export) ─────────────────────────────
function nodeToText(node: any): string {
  if (typeof node.text === 'string') return node.text
  const parts: string[] = (node.children ?? []).map((c: any) => nodeToText(c))
  switch (node.type) {
    case 'heading-one': return `# ${parts.join('')}`
    case 'heading-two': return `## ${parts.join('')}`
    case 'bulleted-list':
    case 'numbered-list': return parts.join('\n')
    case 'list-item': return `- ${parts.join('')}`
    case 'check-list-item': return `${node.checked ? '[x]' : '[ ]'} ${parts.join('')}`
    default: return parts.join('')
  }
}

function slateToMarkdown(content: string): string {
  try {
    const nodes = JSON.parse(content)
    return Array.isArray(nodes) ? nodes.map(nodeToText).join('\n') : content
  } catch {
    return content
  }
}

// ── Export helpers ─────────────────────────────────────────────────────────────
async function exportAsJson(): Promise<void> {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Notes as JSON',
    defaultPath: `note-pins-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!filePath) return
  await writeFile(filePath, JSON.stringify(getAllNotes(), null, 2), 'utf-8')
}

async function exportAsMarkdown(): Promise<void> {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Notes as Markdown',
    defaultPath: `note-pins-${new Date().toISOString().slice(0, 10)}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  })
  if (!filePath) return
  const text = getAllNotes()
    .map((n) => {
      const tags = n.tags.length ? `*Tags: ${n.tags.join(', ')}*\n\n` : ''
      return `# ${n.title || 'Untitled'}\n\n${tags}${slateToMarkdown(n.content)}`
    })
    .join('\n\n---\n\n')
  await writeFile(filePath, text, 'utf-8')
}

app.whenReady().then(async () => {
  // Register as a Windows login item so notes reappear after every restart
  if (process.platform === 'win32') {
    app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] })
  }

  const corruptionInfo = initDb()

  // Secure custom protocol for serving photo images from userData/images/.
  // Replaces webSecurity:false on photo windows — only serves files with a
  // known UUID basename from that directory; path traversal is impossible.
  const imagesDir = join(app.getPath('userData'), 'images')
  protocol.handle('app-image', async (request) => {
    const filename = basename(decodeURIComponent(new URL(request.url).pathname))
    return net.fetch(pathToFileURL(join(imagesDir, filename)).href)
  })

  mainWindow = createMainWindow(!isHiddenStart)
  fwm = new FloatingWindowManager(mainWindow)
  fpm = new FloatingPhotoManager(mainWindow)

  registerIpcHandlers(fwm, fpm, mainWindow)
  startBridge(fwm, fpm, mainWindow)

  // Restore desktop notes/photos immediately — floating windows are independent
  // of the main window and don't need ready-to-show to fire first.
  // Previously this was inside mainWindow.once('ready-to-show'), which never
  // fires for a hidden window (Electron throttles paint for invisible windows).
  fwm.restorePostedNotes(getAllNotes())
  fpm.restorePostedPhotoPins(getAllPhotoPins())

  // Show corruption recovery dialog after the main window is set up
  if (corruptionInfo) {
    if (corruptionInfo.recoveredFromBackup) {
      const dateStr = corruptionInfo.backupDate?.toLocaleString() ?? 'unknown date'
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Notes Restored from Backup',
        message: 'Your notes file was corrupted.',
        detail: `Note Pins automatically restored ${corruptionInfo.noteCount} note${corruptionInfo.noteCount !== 1 ? 's' : ''} from a backup made on ${dateStr}.`,
        buttons: ['OK'],
      })
    } else {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Notes Couldn\'t Be Loaded',
        message: 'Your notes file was corrupted and no backup was found.',
        detail: 'Starting fresh. Use File → Export regularly to keep your own backups.',
        buttons: ['OK'],
      })
    }
  }

  // System tray — lets the user reopen the main window when it's hidden
  const iconPath = join(__dirname, '../../resources/icon.ico')
  tray = new Tray(iconPath)
  tray.setToolTip('Note Pins')
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open Note Pins',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show()
            mainWindow.focus()
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Export Notes as JSON',
        click: () => { exportAsJson() },
      },
      {
        label: 'Export Notes as Markdown',
        click: () => { exportAsMarkdown() },
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])
  )

  app.on('activate', () => {
    // macOS: re-show main window when dock icon clicked
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
    }
  })
})

// Main window hides to tray on close, so window-all-closed only fires if
// all floating note windows are also destroyed (e.g. every note moved back).
// On macOS keep the process alive as usual; on Windows/Linux the tray keeps it alive.
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Allow window-close to actually close during quit (not hide)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close')
  }
  stopBridge()
  fwm?.closeAll()
  fpm?.closeAll()
  tray?.destroy()
})
