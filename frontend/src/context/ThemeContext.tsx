import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ThemeCtx { dark: boolean; toggle: () => void }
const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return <Ctx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)