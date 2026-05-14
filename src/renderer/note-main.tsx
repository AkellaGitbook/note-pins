import './styles.css'
import { createRoot } from 'react-dom/client'
import { NoteWindowApp } from './note-window/App'

const root = document.getElementById('root')!
const noteId = new URLSearchParams(window.location.search).get('noteId')!
document.body.style.cssText = 'margin:0;overflow:hidden;background:transparent'
createRoot(root).render(<NoteWindowApp noteId={noteId} />)
