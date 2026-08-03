import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { validateContent } from './content'
import './ui/theme.css'

// Content is data, which means a class of typo the compiler cannot see. The
// packs are validated in tests always, and here at boot during development.
if (import.meta.env.DEV) {
  const errors = validateContent()
  if (errors.length) {
    console.error(`Content validation failed (${errors.length}):\n` + errors.join('\n'))
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
