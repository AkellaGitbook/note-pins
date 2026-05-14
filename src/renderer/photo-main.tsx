import './styles.css'
import { createRoot } from 'react-dom/client'
import { PhotoWindowApp } from './photo-window/App'

const root = document.getElementById('root')!
const photoId = new URLSearchParams(window.location.search).get('photoId')!
document.body.style.cssText = 'margin:0;overflow:hidden;background:transparent'
createRoot(root).render(<PhotoWindowApp photoId={photoId} />)
