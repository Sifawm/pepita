import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Link, Route, Routes } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import Ajustes from '@/pantallas/Ajustes'
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
        <div className="flex items-center justify-between py-2">
          <p className="text-lg font-bold text-primary">{t('app.nombre')}</p>
          <Link to="/ajustes" aria-label={t('ajustes.titulo')} className={buttonVariants({ variant: 'ghost', className: 'min-w-11 px-0' })}>
            <Settings aria-hidden />
          </Link>
        </div>
        <main id="principal" tabIndex={-1} className="outline-none">
          <Routes>
            <Route path="/" element={<Hoy />} />
            <Route path="/nuevo" element={<NuevoHabito />} />
            <Route path="/ajustes" element={<Ajustes />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
