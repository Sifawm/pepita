// Installing the PWA and requesting persistent storage. Platform only: no business logic.
import { useEffect, useState, useSyncExternalStore } from 'react'

/** `beforeinstallprompt` (Chromium): not in the DOM types. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// The browser fires it only once and early: it's stored when the module loads so it can be offered later.
let promptEvent: InstallPromptEvent | undefined
const listeners = new Set<() => void>()
const setPrompt = (next: InstallPromptEvent | undefined) => {
  promptEvent = next
  listeners.forEach((f) => f())
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // no browser mini-infobar: Pepita offers it at the right moment
  setPrompt(e as InstallPromptEvent)
})
window.addEventListener('appinstalled', () => setPrompt(undefined))

/** The native install prompt, if the browser offers it right now. */
export const useInstallPrompt = () =>
  useSyncExternalStore(
    (f) => (listeners.add(f), () => listeners.delete(f)),
    () => promptEvent,
  )

/** Opens the native prompt; it can only be used once. */
export async function install() {
  if (!promptEvent) return
  await promptEvent.prompt()
  await promptEvent.userChoice
  setPrompt(undefined)
}

/** Opened from the home screen (already installed). */
export const isInstalled = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** iPhone or iPad (modern iPads present themselves as a touch Mac): there it's installed by hand from Share. */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

/** `true`/`false`: the browser's answer; `null`: not supported; `undefined`: asking. */
export function usePersistentStorage() {
  const [persistent, setPersistent] = useState<boolean | null | undefined>(() => ('storage' in navigator ? undefined : null))
  useEffect(() => {
    // Returns `true` if already granted; otherwise it asks (it's also requested on startup).
    navigator.storage?.persist().then(setPersistent, () => setPersistent(false))
  }, [])
  return persistent
}
