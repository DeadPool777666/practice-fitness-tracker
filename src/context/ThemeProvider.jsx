import { useEffect, useState } from 'react'
import { ThemeContext } from './themeContext.js'

const STORAGE_KEY = 'fittrack-theme' // второстепенная UI-настройка, не бизнес-данные
const readTheme = () => { const saved = localStorage.getItem(STORAGE_KEY); return ['light', 'dark', 'system'].includes(saved) ? saved : 'system' }

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const setTheme = (value) => { localStorage.setItem(STORAGE_KEY, value); setThemeState(value) }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
