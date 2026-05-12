import './styles.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MainApp } from './main-window/App'
import { NoteWindowApp } from './note-window/App'
import { PhotoWindowApp } from './photo-window/App'

const root = document.getElementById('root')!
const params = new URLSearchParams(window.location.search)
const noteId = params.get('noteId')
const photoId = params.get('photoId')

if (noteId) {
  document.body.style.cssText = 'margin:0;overflow:hidden;background:transparent'
  createRoot(root).render(<NoteWindowApp noteId={noteId} />)
} else if (photoId) {
  document.body.style.cssText = 'margin:0;overflow:hidden;background:transparent'
  createRoot(root).render(<PhotoWindowApp photoId={photoId} />)
} else {
  createRoot(root).render(
    <React.StrictMode>
      <MainApp />
    </React.StrictMode>
  )
}
