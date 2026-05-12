import { useState, useEffect } from 'react'
import { useNotesStore, useSelectedNote } from '../store/useNotesStore'
import { useSelectedPhotoPin } from '../store/usePhotoPinsStore'
import { Sidebar } from './Sidebar'
import { NoteGrid } from './NoteGrid'
import { EditorPanel } from './EditorPanel'
import { PhotosPanel } from './PhotosPanel'
import { PhotoPinDetail } from './PhotoPinDetail'

type Tab = 'notes' | 'photos'

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const selectedNote = useSelectedNote()
  const selectedPhotoPin = useSelectedPhotoPin()
  const { createNote, deleteNote, selectNote } = useNotesStore()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !inInput) {
        e.preventDefault()
        if (activeTab === 'notes') createNote()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setActiveTab('notes')
        // Let the notes tab render before querying the DOM
        setTimeout(() => {
          document.querySelector<HTMLInputElement>('input[placeholder="Search notes..."]')?.focus()
        }, 0)
      } else if (e.key === 'Delete' && !inInput && selectedNote) {
        deleteNote(selectedNote.id)
      } else if (e.key === 'Escape') {
        if (inInput) {
          target.blur()
        } else if (selectedNote) {
          selectNote(null)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTab, selectedNote, createNote, deleteNote, selectNote])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex flex-1 min-w-0">
        {activeTab === 'notes' ? (
          <>
            <NoteGrid />
            {selectedNote && (
              <EditorPanel key={selectedNote.id} note={selectedNote} />
            )}
          </>
        ) : (
          <>
            <PhotosPanel />
            {selectedPhotoPin && (
              <PhotoPinDetail key={selectedPhotoPin.id} pin={selectedPhotoPin} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
