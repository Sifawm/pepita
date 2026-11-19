import { useTranslation } from 'react-i18next'
import { HashRouter, Route, Routes } from 'react-router'
import Hoy from '@/pantallas/Hoy'
import NuevoHabito from '@/pantallas/NuevoHabito'

export default function App() {
  const { t } = useTranslation()
  return (
    <HashRouter>
      <a
        href="#principal"
        onClick={(e) => {
          // Con enrutado por hash, un ancla normal cambiaría de ruta.
          e.preventDefault()
          document.getElementById('principal')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-card focus:p-3"
      >
        {t('app.saltar')}
      </a>
      <div className="mx-auto max-w-md px-4 pb-10">
        <p className="py-4 text-lg font-bold text-primary">{t('app.nombre')}</p>
        <main id="principal" tabIndex={-1} className="outline-none">
          <Routes>
            <Route path="/" element={<Hoy />} />
            <Route path="/nuevo" element={<NuevoHabito />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
