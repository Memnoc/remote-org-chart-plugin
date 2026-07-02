import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(
    () => (localStorage.getItem('theme') as ThemeMode) ?? 'system'
  )
  const [sysDark, setSysDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const dark = theme === 'system' ? sysDark : theme === 'dark'

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark, theme])

  return { theme, setTheme, dark }
}
