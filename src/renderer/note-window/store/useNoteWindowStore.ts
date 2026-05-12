import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Note } from '../../../shared/types'

type State = {
  note: Note | null
  noteId: string | null
  loading: boolean
}

type Actions = {
  load: (id: string) => Promise<void>
  applyUpdate: (note: Note) => void
}

export const useNoteWindowStore = create<State & Actions>()(
  immer((set) => ({
    note: null,
    noteId: null,
    loading: true,

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
  }))
)
