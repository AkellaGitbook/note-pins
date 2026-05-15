import { useEffect } from 'react'
import { useNoteWindowStore } from './store/useNoteWindowStore'
import { StickyNote } from './components/StickyNote'
import { ResizeGrip } from './components/ResizeGrip'

type Props = { noteId: string }

export function NoteWindowApp({ noteId }: Props) {
  const { note, loading, load, applyUpdate, enterEditMode, exitEditMode } = useNoteWindowStore()

  useEffect(() => {
    load(noteId)
    window.floatApi.onNoteUpdated(applyUpdate)
    window.floatApi.onEnterEdit(() => enterEditMode())
  }, [noteId])

  if (loading || !note) {
    return <div style={{ width: '100vw', height: '100vh', background: 'transparent' }} />
  }

  return (
    <div
      tabIndex={0}
      style={{ width: '100vw', height: '100vh', position: 'relative' }}
      onContextMenu={(e) => {
        e.preventDefault()
        window.floatApi.openContextMenu(noteId)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          exitEditMode()
        }
      }}
    >
      <StickyNote note={note} />
      <ResizeGrip />
    </div>
  )
}
