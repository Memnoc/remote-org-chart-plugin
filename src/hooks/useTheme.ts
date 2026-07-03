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
