import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { Note, PhotoPin } from '../../shared/types'

contextBridge.exposeInMainWorld('noteApi', {
  getAllNotes: (): Promise<Note[]> => ipcRenderer.invoke(IPC.NOTES_GET_ALL),

  createNote: (partial?: Partial<Note>): Promise<Note> =>
    ipcRenderer.invoke(IPC.NOTES_CREATE, partial),

  updateNote: (id: string, patch: Partial<Note>): Promise<Note | null> =>
    ipcRenderer.invoke(IPC.NOTES_UPDATE, id, patch),

  deleteNote: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.NOTES_DELETE, id),

  duplicateNote: (id: string): Promise<Note | null> =>
    ipcRenderer.invoke(IPC.NOTES_DUPLICATE, id),

  searchNotes: (query: string): Promise<Note[]> =>
    ipcRenderer.invoke(IPC.NOTES_SEARCH, query),

  postNote: (id: string): Promise<Note | null> => ipcRenderer.invoke(IPC.NOTE_POST, id),

  moveNoteBack: (id: string): Promise<Note | null> =>
    ipcRenderer.invoke(IPC.NOTE_MOVE_BACK, id),

  confirm: (message: string, detail?: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.DIALOG_CONFIRM, message, detail),

  onNoteUpdated: (cb: (note: Note) => void): void => {
    ipcRenderer.on(IPC.MAIN_NOTE_UPDATED, (_e, note) => cb(note))
  },

  onNoteDeleted: (cb: (id: string) => void): void => {
    ipcRenderer.on(IPC.MAIN_NOTE_DELETED, (_e, id) => cb(id))
  },

  onNoteAdded: (cb: (note: Note) => void): void => {
    ipcRenderer.on(IPC.MAIN_NOTE_ADDED, (_e, note) => cb(note))
  },

  onSelectNote: (cb: (id: string) => void): void => {
    ipcRenderer.on(IPC.MAIN_SELECT_NOTE, (_e, id) => cb(id))
  },
})

contextBridge.exposeInMainWorld('photoApi', {
  getAllPhotoPins: (): Promise<PhotoPin[]> => ipcRenderer.invoke(IPC.PHOTO_PINS_GET_ALL),

  createPhotoPin: (sourcePath: string): Promise<PhotoPin> =>
    ipcRenderer.invoke(IPC.PHOTO_PINS_CREATE, sourcePath),

  updatePhotoPin: (id: string, patch: Partial<PhotoPin>): Promise<PhotoPin | null> =>
    ipcRenderer.invoke(IPC.PHOTO_PINS_UPDATE, id, patch),

  deletePhotoPin: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.PHOTO_PINS_DELETE, id),

  postPhotoPin: (id: string): Promise<PhotoPin | null> =>
    ipcRenderer.invoke(IPC.PHOTO_PIN_POST, id),

  movePhotoPinBack: (id: string): Promise<PhotoPin | null> =>
    ipcRenderer.invoke(IPC.PHOTO_PIN_MOVE_BACK, id),

  pickImageFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.PHOTO_PINS_PICK_FILE),

  confirm: (message: string, detail?: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.DIALOG_CONFIRM, message, detail),

  onPhotoPinAdded: (cb: (pin: PhotoPin) => void): void => {
    ipcRenderer.on(IPC.MAIN_PHOTO_PIN_ADDED, (_e, pin) => cb(pin))
  },

  onPhotoPinUpdated: (cb: (pin: PhotoPin) => void): void => {
    ipcRenderer.on(IPC.MAIN_PHOTO_PIN_UPDATED, (_e, pin) => cb(pin))
  },

  onPhotoPinDeleted: (cb: (id: string) => void): void => {
    ipcRenderer.on(IPC.MAIN_PHOTO_PIN_DELETED, (_e, id) => cb(id))
  },

  onSelectPhoto: (cb: (id: string) => void): void => {
    ipcRenderer.on(IPC.MAIN_SELECT_PHOTO, (_e, id) => cb(id))
  },
})
