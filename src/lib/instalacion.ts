// Instalar la PWA y pedir almacenamiento persistente. Solo plataforma: sin lógica de negocio.
import { useEffect, useState, useSyncExternalStore } from 'react'

/** `beforeinstallprompt` (Chromium): no está en los tipos del DOM. */
interface AvisoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// El navegador lo lanza una sola vez y pronto: se guarda al cargar el módulo para ofrecerlo luego.
let aviso: AvisoInstalacion | undefined
const oyentes = new Set<() => void>()
const avisar = (nuevo: AvisoInstalacion | undefined) => {
  aviso = nuevo
  oyentes.forEach((f) => f())
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // sin la mini barra del navegador: lo ofrece Pepita en su momento
  avisar(e as AvisoInstalacion)
})
window.addEventListener('appinstalled', () => avisar(undefined))

/** El aviso nativo de instalación, si el navegador lo ofrece ahora. */
export const useAvisoInstalacion = () =>
  useSyncExternalStore(
    (f) => (oyentes.add(f), () => oyentes.delete(f)),
    () => aviso,
  )

/** Abre el aviso nativo; solo se puede usar una vez. */
export async function instalar() {
  if (!aviso) return
  await aviso.prompt()
  await aviso.userChoice
  avisar(undefined)
}

/** Abierta desde la pantalla de inicio (ya instalada). */
export const instalada = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** iPhone o iPad (el iPad moderno se presenta como Mac táctil): allí se instala a mano desde Compartir. */
export const esIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

/** `true`/`false`: respuesta del navegador; `null`: no lo permite; `undefined`: preguntando. */
export function usePersistente() {
  const [persistente, setPersistente] = useState<boolean | null | undefined>(() =>
    'storage' in navigator ? undefined : null,
  )
  useEffect(() => {
    // Devuelve `true` si ya estaba concedido; si no, lo pide (también se pide al arrancar).
    navigator.storage?.persist().then(setPersistente, () => setPersistente(false))
  }, [])
  return persistente
}
