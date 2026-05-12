import type { Note, PhotoPin } from '../shared/types'

declare global {
  interface Window {
    noteApi: {
      getAllNotes: () => Promise<Note[]>
      createNote: (partial?: Partial<Note>) => Promise<Note>
      updateNote: (id: string, patch: Partial<Note>) => Promise<Note | null>
      deleteNote: (id: string) => Promise<boolean>
      duplicateNote: (id: string) => Promise<Note | null>
      searchNotes: (query: string) => Promise<Note[]>
      postNote: (id: string) => Promise<Note | null>
      moveNoteBack: (id: string) => Promise<Note | null>
      confirm: (message: string, detail?: string) => Promise<boolean>
      onNoteUpdated: (cb: (note: Note) => void) => void
      onNoteDeleted: (cb: (id: string) => void) => void
      onNoteAdded: (cb: (note: Note) => void) => void
      onSelectNote: (cb: (id: string) => void) => void
    }
    floatApi: {
      getNoteId: () => string | null
      getNote: (id: string) => Promise<Note | null>
      reportMove: (id: string, x: number, y: number) => Promise<void>
      reportResize: (id: string, w: number, h: number, x: number, y: number) => Promise<void>
      openContextMenu: (id: string) => Promise<void>
      updateStyle: (id: string, patch: Partial<Note>) => Promise<Note | null>
      setAlwaysOnTop: (id: string, value: boolean) => Promise<void>
      onNoteUpdated: (cb: (note: Note) => void) => void
    }
    photoApi: {
      getAllPhotoPins: () => Promise<PhotoPin[]>
      createPhotoPin: (sourcePath: string) => Promise<PhotoPin>
      updatePhotoPin: (id: string, patch: Partial<PhotoPin>) => Promise<PhotoPin | null>
      deletePhotoPin: (id: string) => Promise<boolean>
      postPhotoPin: (id: string) => Promise<PhotoPin | null>
      movePhotoPinBack: (id: string) => Promise<PhotoPin | null>
      pickImageFile: () => Promise<string | null>
      confirm: (message: string, detail?: string) => Promise<boolean>
      onPhotoPinAdded: (cb: (pin: PhotoPin) => void) => void
      onPhotoPinUpdated: (cb: (pin: PhotoPin) => void) => void
      onPhotoPinDeleted: (cb: (id: string) => void) => void
    }
    floatPhotoApi: {
      getPhotoId: () => string | null
      getPhotoPin: (id: string) => Promise<PhotoPin | null>
      openContextMenu: (id: string) => Promise<void>
      updateStyle: (id: string, patch: Partial<PhotoPin>) => Promise<PhotoPin | null>
      setAlwaysOnTop: (id: string, value: boolean) => Promise<void>
      onPhotoPinUpdated: (cb: (pin: PhotoPin) => void) => void
    }
  }
}

export {}
