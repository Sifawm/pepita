import { liveQuery } from 'dexie'
import { ChevronLeft, Settings } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Link, matchPath, Route, Routes, useLocation } from 'react-router'
import { Avisos } from '@/components/Recordatorios'
import { buttonVariants } from '@/components/ui/button'
import { db, leerAjustes, reconciliarDiagnosticosGuardados, useAjustes } from '@/db'
import { proximoCierre } from '@/dominio'
import Ajustes from '@/pantallas/Ajustes'
import Archivados from '@/pantallas/Archivados'
import AsistenteHabito from '@/pantallas/AsistenteHabito'
import Habito from '@/pantallas/Habito'
import Hoy from '@/pantallas/Hoy'
import Identidad from '@/pantallas/Identidad'
import Identidades from '@/pantallas/Identidades'
import PrimerosPasos from '@/pantallas/PrimerosPasos'
import Revision from '@/pantallas/Revision'

/**
 * Mantiene los diagnósticos al día mientras la app está abierta: tras cada cambio de hábitos,
 * registros o ajustes (también al corregir el pasado o importar), al volver a la app y en cada
 * cierre del día lógico (ahí se cierran periodos y pueden aparecer rupturas).
 */
function useDiagnosticosAlDia() {
  useEffect(() => {
    let vivo = true
    let cierre: ReturnType<typeof setTimeout> | undefined
    const revisar = async () => {
      const ahora = new Date()
      await reconciliarDiagnosticosGuardados(ahora)
      const { horaCierre } = await leerAjustes()
      clearTimeout(cierre)
      // Un segundo de margen: justo al cierre ya es el día nuevo.
      if (vivo) cierre = setTimeout(revisar, proximoCierre(ahora, horaCierre).getTime() - ahora.getTime() + 1000)
    }
    const cambios = liveQuery(() => Promise.all([db.habitos.toArray(), db.registros.toArray(), db.ajustes.toArray()])).subscribe(() => void revisar())
    const alVolver = () => document.visibilityState === 'visible' && void revisar()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      clearTimeout(cierre)
      cambios.unsubscribe()
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])
}

/** El idioma guardado en Ajustes manda (también tras importar una copia); sin él, el del navegador. */
function useIdiomaGuardado() {
  const { i18n } = useTranslation()
  const idioma = useAjustes()?.idioma
  useEffect(() => {
    if (idioma && idioma !== i18n.resolvedLanguage) void i18n.changeLanguage(idioma)
  }, [idioma, i18n])
}

/** A dónde lleva el «atrás» de la cabecera, como en cualquier app móvil. Sin destino, la pantalla es raíz. */
function useAtras(): { to: string; etiqueta: string; nombre: string } | undefined {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  if (pathname === '/' || pathname === '/primeros-pasos') return undefined
  const editar = matchPath('/habito/:id/editar', pathname)
  if (editar) return { to: `/habito/${editar.params.id}`, etiqueta: t('asistente.atras'), nombre: t('asistente.atras') }
  const [to, etiqueta] = matchPath('/identidades/:id', pathname) ? ['/identidades', t('identidades.titulo')] : ['/', t('hoy.titulo')]
  return { to, etiqueta, nombre: t('app.volverA', { destino: etiqueta }) }
}

function Cabecera() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const atras = useAtras()
  return (
    <header className="flex items-center justify-between py-2 print:hidden">
      {atras ? (
        <Link to={atras.to} aria-label={atras.nombre} className={buttonVariants({ variant: 'ghost', className: '-ml-3 gap-1 px-2 text-primary' })}>
          <ChevronLeft aria-hidden className="size-6" />
          {atras.etiqueta}
        </Link>
      ) : pathname === '/' ? (
        // El título de Hoy vive en la cabecera: es el h1 de la pantalla.
        <h1 className="text-3xl font-bold">{t('hoy.titulo')}</h1>
      ) : (
        <p className="text-lg font-bold text-primary">{t('app.nombre')}</p>
      )}
      {pathname !== '/ajustes' && (
        <Link to="/ajustes" aria-label={t('ajustes.titulo')} className={buttonVariants({ variant: 'ghost', className: 'min-w-11 px-0' })}>
          <Settings aria-hidden />
        </Link>
      )}
    </header>
  )
}

export default function App() {
  const { t } = useTranslation()
  useDiagnosticosAlDia()
  useIdiomaGuardado()
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
        <Cabecera />
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
