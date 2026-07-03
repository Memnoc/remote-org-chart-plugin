/**
 * useTheme — three-way theme (light / dark / system) with persistence.
 *
 * Two inputs decide the effective colour scheme:
 *   theme   — the user's picker choice, persisted to localStorage
 *   sysDark — the OS preference, live-subscribed via matchMedia
 * `dark` combines them; the effect below projects it onto
 * <html data-theme="…">, which is what every CSS custom property in
 * index.css keys off. No CSS-in-JS theme context — the DOM attribute IS
 * the theme mechanism.
 *
 * Debugging: theme looks wrong → inspect <html> in devtools; data-theme
 * should flip when you change the picker or the OS setting.
 */
import { useState, useEffect, useSyncExternalStore } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

// prefers-color-scheme is an external store — subscribe with the primitive
// built for it instead of a useState + useEffect pair.
// (react.dev/learn/you-might-not-need-an-effect — "Subscribing to an external store")
function subscribeSysDark(onChange: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSysDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem('theme') as ThemeMode) ?? 'system'
  )
  const sysDark = useSyncExternalStore(subscribeSysDark, getSysDark)

  const dark = theme === 'system' ? sysDark : theme === 'dark'

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark, theme])

  return { theme, setTheme, dark }
}
