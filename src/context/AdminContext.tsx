/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type {
  AdminGameSystemUpsertRequest,
  AdminSheetTypeUpsertRequest,
  CampaignCatalogEntry,
  SheetTypeCatalogEntry,
} from '../types/domain'

export type AdminContextValue = {
  busy: boolean
  gameSystems: CampaignCatalogEntry[]
  sheetTypes: SheetTypeCatalogEntry[]
  refreshSystemCatalogs: () => void
  createGameSystem: (payload: AdminGameSystemUpsertRequest) => Promise<void>
  saveGameSystem: (code: string, payload: AdminGameSystemUpsertRequest) => Promise<void>
  createSheetType: (payload: AdminSheetTypeUpsertRequest) => Promise<void>
  saveSheetType: (code: string, payload: AdminSheetTypeUpsertRequest) => Promise<void>
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ value, children }: { value: AdminContextValue; children: ReactNode }) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdminContext() {
  const value = useContext(AdminContext)
  if (!value) throw new Error('AdminContext non disponibile')
  return value
}
