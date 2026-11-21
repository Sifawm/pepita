import '@/index.css'
import '@/i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'

// Ask the browser not to evict the data when space runs low. Settings shows the answer.
void navigator.storage?.persist()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
