import '@/index.css'
import '@/i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'

// Pide al navegador que no borre los datos por falta de espacio. Ajustes muestra la respuesta.
void navigator.storage?.persist()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
