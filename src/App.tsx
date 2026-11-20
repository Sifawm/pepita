import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Link, Route, Routes } from 'react-router'
import { Avisos } from '@/components/Recordatorios'
import { buttonVariants } from '@/components/ui/button'
import { useDiagnosticosAlDia } from '@/db'
import Ajustes from '@/pantallas/Ajustes'
import Archivados from '@/pantallas/Archivados'
import AsistenteHabito from '@/pantallas/AsistenteHabito'
import Habito from '@/pantallas/Habito'
import Hoy from '@/pantallas/Hoy'
import Identidad from '@/pantallas/Identidad'
import Identidades from '@/pantallas/Identidades'
import PrimerosPasos from '@/pantallas/PrimerosPasos'
import Revision from '@/pantallas/Revision'

export default function App() {
  const { t } = useTranslation()
  useDiagnosticosAlDia()
  return (
    <HashRouter>
      <Avisos />
      <a
        href="#principal"
        onClick={(e) => {
          // Con enrutado por hash, un ancla normal cambiaría de ruta.
          e.preventDefault()
          document.getElementById('principal')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-card focus:p-3 print:hidden"
      >
        {t('app.saltar')}
      </a>
      <div className="mx-auto max-w-md px-4 pb-10 print:max-w-none print:p-0">
        <div className="flex items-center justify-between py-2 print:hidden">
          <p className="text-lg font-bold text-primary">{t('app.nombre')}</p>
          <Link to="/ajustes" aria-label={t('ajustes.titulo')} className={buttonVariants({ variant: 'ghost', className: 'min-w-11 px-0' })}>
            <Settings aria-hidden />
          </Link>
        </div>
        <main id="principal" tabIndex={-1} className="outline-none">
          <Routes>
            <Route path="/" element={<Hoy />} />
            <Route path="/nuevo" element={<AsistenteHabito />} />
            <Route path="/habito/:id/editar" element={<AsistenteHabito />} />
            <Route path="/archivados" element={<Archivados />} />
            <Route path="/identidades" element={<Identidades />} />
            <Route path="/identidades/:id" element={<Identidad />} />
            <Route path="/habito/:id" element={<Habito />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/primeros-pasos" element={<PrimerosPasos />} />
            <Route path="/revision" element={<Revision />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
