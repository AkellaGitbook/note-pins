import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Note } from '../../../shared/types'

type State = {
  notes: Note[]
  selectedId: string | null
  searchQuery: string
}

type Actions = {
  loadNotes: () => Promise<void>
  selectNote: (id: string | null) => void
  createNote: () => Promise<void>
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  duplicateNote: (id: string) => Promise<void>
  postNote: (id: string) => Promise<void>
  moveNoteBack: (id: string) => Promise<void>
  setSearch: (q: string) => void
  // IPC push handlers
  applyNoteUpdated: (note: Note) => void
  applyNoteDeleted: (id: string) => void
  applyNoteAdded: (note: Note) => void
}

function getFiltered(notes: Note[], query: string): Note[] {
  let list = notes.filter((n) => n.status !== 'posted')
  if (query.trim()) {
    const q = query.toLowerCase()
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    )
  }
  return list
}

export const useNotesStore = create<State & Actions>()(
  immer((set, get) => ({
    notes: [],
    selectedId: null,
    searchQuery: '',

    loadNotes: async () => {
      const notes = await window.noteApi.getAllNotes()
      set((s) => {
        s.notes = notes
      })
    },

    selectNote: (id) => {
      set((s) => {
        s.selectedId = id
      })
    },

    createNote: async () => {
      const note = await window.noteApi.createNote()
      set((s) => {
        if (!s.notes.find((n) => n.id === note.id)) s.notes.unshift(note)
        s.selectedId = note.id
      })
    },

    updateNote: async (id, patch) => {
      const updated = await window.noteApi.updateNote(id, patch)
      if (!updated) return
      set((s) => {
        const idx = s.notes.findIndex((n) => n.id === id)
        if (idx !== -1) s.notes[idx] = updated
      })
    },

    deleteNote: async (id) => {
      const confirmed = await window.noteApi.confirm(
        'Delete this note?',
        'This cannot be undone.'
      )
      if (!confirmed) return
      await window.noteApi.deleteNote(id)
      set((s) => {
        s.notes = s.notes.filter((n) => n.id !== id)
        if (s.selectedId === id) s.selectedId = null
      })
    },

    duplicateNote: async (id) => {
      const copy = await window.noteApi.duplicateNote(id)
      if (!copy) return
      set((s) => {
        if (!s.notes.find((n) => n.id === copy.id)) s.notes.unshift(copy)
        s.selectedId = copy.id
      })
    },

    postNote: async (id) => {
      const note = await window.noteApi.postNote(id)
      if (!note) return
      set((s) => {
        const idx = s.notes.findIndex((n) => n.id === id)
        if (idx !== -1) s.notes[idx] = note
        if (s.selectedId === id) s.selectedId = null
      })
    },

    moveNoteBack: async (id) => {
      const note = await window.noteApi.moveNoteBack(id)
      if (!note) return
      set((s) => {
        const idx = s.notes.findIndex((n) => n.id === id)
        if (idx !== -1) s.notes[idx] = note
        else s.notes.unshift(note)
        s.selectedId = note.id
      })
    },

    setSearch: (q) => {
      set((s) => {
        s.searchQuery = q
      })
    },

    applyNoteUpdated: (note) => {
      set((s) => {
        const idx = s.notes.findIndex((n) => n.id === note.id)
        if (idx !== -1) {
          s.notes[idx] = note
        } else {
          s.notes.unshift(note)
        }
      })
    },

    applyNoteDeleted: (id) => {
      set((s) => {
        s.notes = s.notes.filter((n) => n.id !== id)
        if (s.selectedId === id) s.selectedId = null
      })
    },

    applyNoteAdded: (note) => {
      set((s) => {
        if (!s.notes.find((n) => n.id === note.id)) {
          s.notes.unshift(note)
        }
      })
    },
  }))
)

export const useFilteredNotes = () => {
  return useNotesStore((s) => getFiltered(s.notes, s.searchQuery))
}

export const useSelectedNote = () => {
  return useNotesStore((s) => s.notes.find((n) => n.id === s.selectedId) ?? null)
}
