import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Note } from '../../../shared/types'

type State = {
  note: Note | null
  noteId: string | null
  loading: boolean
  isEditing: boolean
}

type Actions = {
  load: (id: string) => Promise<void>
  applyUpdate: (note: Note) => void
  enterEditMode: () => void
  exitEditMode: () => void
}

export const useNoteWindowStore = create<State & Actions>()(
  immer((set) => ({
    note: null,
    noteId: null,
    loading: true,
    isEditing: false,

    load: async (id: string) => {
      set((s) => {
        s.noteId = id
        s.loading = true
      })
      const note = await window.floatApi.getNote(id)
      set((s) => {
        s.note = note
        s.loading = false
      })
    },

    applyUpdate: (note: Note) => {
      set((s) => {
        s.note = note
      })
    },

    enterEditMode: () => set((s) => { s.isEditing = true }),

    exitEditMode: () => set((s) => { s.isEditing = false }),
  }))
)
