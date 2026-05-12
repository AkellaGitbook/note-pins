import { useEffect } from 'react'
import { useNotesStore } from './store/useNotesStore'
import { usePhotoPinsStore } from './store/usePhotoPinsStore'
import { AppShell } from './components/AppShell'

export function MainApp() {
  const { loadNotes, applyNoteUpdated, applyNoteDeleted, applyNoteAdded, selectNote } = useNotesStore()
  const { loadPins, applyPinUpdated, applyPinDeleted, applyPinAdded } = usePhotoPinsStore()

  useEffect(() => {
    loadNotes()
    window.noteApi.onNoteUpdated(applyNoteUpdated)
    window.noteApi.onNoteDeleted(applyNoteDeleted)
    window.noteApi.onNoteAdded(applyNoteAdded)
    window.noteApi.onSelectNote(selectNote)

    loadPins()
    window.photoApi.onPhotoPinUpdated(applyPinUpdated)
    window.photoApi.onPhotoPinDeleted(applyPinDeleted)
    window.photoApi.onPhotoPinAdded(applyPinAdded)
  }, [])

  return <AppShell />
}
