import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { Note } from '../../shared/types'

contextBridge.exposeInMainWorld('floatApi', {
  getNoteId: (): string | null => new URLSearchParams(window.location.search).get('noteId'),

  getNote: (id: string): Promise<Note | null> => ipcRenderer.invoke(IPC.NOTES_GET_ONE, id),

  reportMove: (id: string, x: number, y: number): Promise<void> =>
    ipcRenderer.invoke(IPC.FLOAT_MOVE, id, x, y),

  reportResize: (id: string, w: number, h: number, x: number, y: number): Promise<void> =>
    ipcRenderer.invoke(IPC.FLOAT_RESIZE, id, w, h, x, y),

  openContextMenu: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.FLOAT_CONTEXT_MENU, id),

  updateStyle: (id: string, patch: Partial<Note>): Promise<Note | null> =>
    ipcRenderer.invoke(IPC.NOTE_UPDATE_STYLE, id, patch),

  setAlwaysOnTop: (id: string, value: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC.FLOAT_SET_ALWAYS_ON_TOP, id, value),

  onNoteUpdated: (cb: (note: Note) => void): void => {
    ipcRenderer.on(IPC.MAIN_NOTE_UPDATED, (_e, note) => cb(note))
  },
})
