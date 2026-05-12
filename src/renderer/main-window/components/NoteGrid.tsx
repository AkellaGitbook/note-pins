import { useFilteredNotes, useNotesStore } from '../store/useNotesStore'
import { NoteCard } from './NoteCard'
import { EmptyState } from './EmptyState'

export function NoteGrid() {
  const notes = useFilteredNotes()
  const { selectedId, selectNote, createNote } = useNotesStore()

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-slate-500">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </h2>
      </div>

      {notes.length === 0 ? (
        <EmptyState onCreate={createNote} />
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isSelected={note.id === selectedId}
              onClick={() => selectNote(note.id === selectedId ? null : note.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
