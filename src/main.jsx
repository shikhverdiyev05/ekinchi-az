import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { logError } from './utils/errors'

window.addEventListener('unhandledrejection', (event) => {
  logError('Tutulmamis promise xetasi', event.reason)
})

window.addEventListener('error', (event) => {
  logError('Tutulmamis xeta', event.error || event.message)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
