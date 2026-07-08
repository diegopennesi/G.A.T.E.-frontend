/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Screen, ThemeMode, UiEvent } from '../types/ui'

export type UiContextValue = {
  screen: Screen
  setScreen: (screen: Screen) => void
  goToScreen: (screen: Screen) => void
  busy: boolean
  error: string
  events: UiEvent[]
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ value, children }: { value: UiContextValue; children: ReactNode }) {
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUiContext() {
  const value = useContext(UiContext)
  if (!value) throw new Error('UiContext non disponibile')
  return value
}
