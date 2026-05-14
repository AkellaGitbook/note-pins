import './styles.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MainApp } from './main-window/App'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
)
