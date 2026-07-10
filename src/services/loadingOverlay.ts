import { useSyncExternalStore } from 'react'

type LoadingSnapshot = {
  pendingCount: number
  latestLabel: string
}

type Listener = () => void

const listeners = new Set<Listener>()
const pendingRequestIds = new Set<string>()
const requestLabels = new Map<string, string>()
let currentSnapshot: LoadingSnapshot = {
  pendingCount: 0,
  latestLabel: '',
}

function emit() {
  const latestId = Array.from(pendingRequestIds).at(-1) || ''
  currentSnapshot = {
    pendingCount: pendingRequestIds.size,
    latestLabel: latestId ? requestLabels.get(latestId) || '' : '',
  }
  for (const listener of listeners) listener()
}

export function showLoading(label = 'Caricamento dati') {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  pendingRequestIds.add(requestId)
  requestLabels.set(requestId, label)
  emit()
  return requestId
}

export function hideLoading(requestId: string) {
  if (!requestId) return
  pendingRequestIds.delete(requestId)
  requestLabels.delete(requestId)
  emit()
}

export function subscribeLoading(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getLoadingSnapshot() {
  return currentSnapshot
}

export function useLoadingOverlayState() {
  return useSyncExternalStore(subscribeLoading, getLoadingSnapshot, getLoadingSnapshot)
}
