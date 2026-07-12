import { useState } from 'react'
import type { Screen, ThemeMode, UiEvent } from '../types/ui'

const THEME_KEY = 'gate_theme'

export function useUiState(initialScreen: Screen) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<UiEvent[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'dark' || saved === 'light' ? saved : 'light'
  })

  const addEvent = (text: string, level: UiEvent['level']) => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    setEvents((prev) => [{ id, ts: new Date().toISOString(), text, level }, ...prev].slice(0, 50))
  }

  return {
    screen,
    setScreen,
    busy,
    setBusy,
    error,
    setError,
    events,
    setEvents,
    isSidebarOpen,
    setIsSidebarOpen,
    theme,
    setTheme,
    addEvent,
    themeStorageKey: THEME_KEY,
  }
}
