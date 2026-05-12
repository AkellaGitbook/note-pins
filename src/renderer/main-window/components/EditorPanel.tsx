import { useCallback, useRef, useState } from 'react'
import type { Note } from '../../../shared/types'
import { useNotesStore } from '../store/useNotesStore'
import { SlateEditor } from './SlateEditor'
import { TypographyControls } from './TypographyControls'
import { CustomizationPanel } from './CustomizationPanel'
import { NotePreview } from './NotePreview'
import { TagInput } from './ui/TagInput'
import { getTheme } from '../../../shared/themes'

type Props = { note: Note }

export function EditorPanel({ note }: Props) {
  const { updateNote, postNote, moveNoteBack } = useNotesStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const theme = getTheme(note.theme)

  // Local state so keystrokes are instant; store/IPC save is debounced
  const [title, setTitle] = useState(note.title)

  const patch = useCallback(
    (p: Partial<Note>) => updateNote(note.id, p),
    [note.id, updateNote]
  )

  const debouncedPatch = useCallback(
    (p: Partial<Note>) => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => patch(p), 400)
    },
    [patch]
  )

  return (
    <aside className="w-96 flex-shrink-0 flex flex-col bg-white border-l border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <input
          className="flex-1 text-base font-semibold bg-transparent outline-none text-slate-800 placeholder-slate-300"
          value={title}
          placeholder="Note title…"
          onChange={(e) => {
            setTitle(e.target.value)
            debouncedPatch({ title: e.target.value })
          }}
        />
        <div className="flex gap-2 ml-2 flex-shrink-0">
          {note.status === 'posted' ? (
            <button
              onClick={() => moveNoteBack(note.id)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors"
            >
              ↙ Unpost
            </button>
          ) : (
            <button
              onClick={() => postNote(note.id)}
              className="text-xs font-medium px-3 py-1 rounded-md transition-colors whitespace-nowrap"
              style={{ backgroundColor: note.backgroundColor, color: theme.textColor }}
            >
              📌 Post it up!
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Slate editor (contains toolbar internally) */}
        <SlateEditor note={note} onChange={(content) => debouncedPatch({ content })} />

        {/* Tags */}
        <div className="px-4 pb-3">
          <TagInput tags={note.tags} onChange={(tags) => patch({ tags })} />
        </div>

        <div className="border-t border-slate-100" />

        {/* Typography */}
        <div className="px-4 py-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Typography
          </p>
          <TypographyControls note={note} onChange={patch} />
        </div>

        <div className="border-t border-slate-100" />

        {/* Appearance */}
        <div className="px-4 py-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Appearance
          </p>
          <CustomizationPanel note={note} onChange={patch} />
        </div>

        <div className="border-t border-slate-100" />

        {/* Live preview */}
        <div className="px-4 py-3 pb-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Preview
          </p>
          <NotePreview note={note} />
        </div>
      </div>
    </aside>
  )
}
