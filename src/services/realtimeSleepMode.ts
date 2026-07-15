import { getAccessToken } from './apiClient'
import { connectResourceInvalidationStream } from './realtime'
import type { ResourceInvalidationPayload } from '../types/realtime'

type RealtimeManagerOptions = {
  onInvalidate: (payload: ResourceInvalidationPayload) => void
  onUnauthorized: () => void
  onError?: (message: string) => void
  onOpen?: () => void
}

type LeaderLease = {
  ownerTabId: string
  expiresAt: number
  updatedAt: number
}

type RealtimeLifecycleHandle = {
  stop: () => void
}

const LEADER_KEY = 'gate_realtime_leader'
const CHANNEL_NAME = 'gate-realtime'
const LEASE_DURATION_MS = 15_000
const LEASE_REFRESH_MS = 5_000

function createTabId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `tab-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

function now() {
  return Date.now()
}

function readLease(): LeaderLease | null {
  try {
    const raw = localStorage.getItem(LEADER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LeaderLease>
    if (!parsed.ownerTabId || typeof parsed.expiresAt !== 'number' || typeof parsed.updatedAt !== 'number') {
      return null
    }
    return {
      ownerTabId: parsed.ownerTabId,
      expiresAt: parsed.expiresAt,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

function writeLease(lease: LeaderLease) {
  localStorage.setItem(LEADER_KEY, JSON.stringify(lease))
}

function removeLeaseIfOwned(tabId: string) {
  const lease = readLease()
  if (lease?.ownerTabId === tabId) {
    localStorage.removeItem(LEADER_KEY)
  }
}

export function startRealtimeSleepMode(options: RealtimeManagerOptions): RealtimeLifecycleHandle {
  const tabId = createTabId()
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

  let stopped = false
  let ownsLeadership = false
  let streamStop: (() => void) | null = null
  let leaseRefreshTimer: number | null = null

  const clearLeaseRefreshTimer = () => {
    if (leaseRefreshTimer !== null) {
      window.clearInterval(leaseRefreshTimer)
      leaseRefreshTimer = null
    }
  }

  const stopStream = () => {
    if (!streamStop) return
    const stop = streamStop
    streamStop = null
    stop()
  }

  const broadcastInvalidate = (payload: ResourceInvalidationPayload) => {
    if (!channel) return
    channel.postMessage({
      type: 'resource.invalidated',
      payload,
      sourceTabId: tabId,
    })
  }

  const refreshLease = () => {
    if (!ownsLeadership || document.visibilityState !== 'visible') return false
    writeLease({
      ownerTabId: tabId,
      expiresAt: now() + LEASE_DURATION_MS,
      updatedAt: now(),
    })
    return true
  }

  const acquireLeadership = () => {
    if (!getAccessToken() || document.visibilityState !== 'visible') {
      return false
    }

    const lease = readLease()
    const current = now()
    if (lease && lease.ownerTabId !== tabId && lease.expiresAt > current) {
      ownsLeadership = false
      return false
    }

    const nextLease: LeaderLease = {
      ownerTabId: tabId,
      expiresAt: current + LEASE_DURATION_MS,
      updatedAt: current,
    }

    writeLease(nextLease)
    const confirmedLease = readLease()
    const acquired = confirmedLease?.ownerTabId === tabId
    ownsLeadership = acquired
    return acquired
  }

  const syncLifecycle = () => {
    if (stopped) return

    if (!getAccessToken()) {
      ownsLeadership = false
      stopStream()
      clearLeaseRefreshTimer()
      removeLeaseIfOwned(tabId)
      return
    }

    if (document.visibilityState !== 'visible') {
      ownsLeadership = false
      stopStream()
      clearLeaseRefreshTimer()
      removeLeaseIfOwned(tabId)
      return
    }

    const lease = readLease()
    const current = now()

    if (lease && lease.ownerTabId !== tabId && lease.expiresAt > current) {
      ownsLeadership = false
      stopStream()
      clearLeaseRefreshTimer()
      return
    }

    if (!ownsLeadership && !acquireLeadership()) {
      stopStream()
      clearLeaseRefreshTimer()
      return
    }

    if (!streamStop) {
      streamStop = connectResourceInvalidationStream({
        onInvalidate: (payload) => {
          options.onInvalidate(payload)
          broadcastInvalidate(payload)
        },
        onUnauthorized: () => {
          stopStream()
          clearLeaseRefreshTimer()
          removeLeaseIfOwned(tabId)
          ownsLeadership = false
          options.onUnauthorized()
        },
        onError: options.onError,
        onOpen: options.onOpen,
      })
    }

    if (!leaseRefreshTimer) {
      leaseRefreshTimer = window.setInterval(() => {
        if (stopped) return

        if (!getAccessToken() || document.visibilityState !== 'visible') {
          ownsLeadership = false
          stopStream()
          clearLeaseRefreshTimer()
          removeLeaseIfOwned(tabId)
          return
        }

        const leaseRefreshed = refreshLease()
        if (!leaseRefreshed) {
          ownsLeadership = false
          stopStream()
          clearLeaseRefreshTimer()
          removeLeaseIfOwned(tabId)
        }
      }, LEASE_REFRESH_MS)
    }
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') {
      ownsLeadership = false
      stopStream()
      clearLeaseRefreshTimer()
      removeLeaseIfOwned(tabId)
      return
    }

    syncLifecycle()
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== LEADER_KEY) return
    const lease = readLease()
    if (!lease || lease.ownerTabId === tabId || lease.expiresAt <= now()) {
      syncLifecycle()
      return
    }

    if (ownsLeadership && lease.ownerTabId !== tabId) {
      ownsLeadership = false
      stopStream()
      clearLeaseRefreshTimer()
    }
  }

  const handlePageHide = () => {
    ownsLeadership = false
    stopStream()
    clearLeaseRefreshTimer()
    removeLeaseIfOwned(tabId)
  }

  const handleBroadcastMessage = (event: MessageEvent) => {
    const data = event.data as
      | { type?: string; payload?: ResourceInvalidationPayload; sourceTabId?: string }
      | undefined
    if (!data || data.sourceTabId === tabId) return
    if (data.type !== 'resource.invalidated' || !data.payload) return
    options.onInvalidate(data.payload)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('storage', handleStorage)
  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('beforeunload', handlePageHide)
  window.addEventListener('focus', syncLifecycle)
  window.addEventListener('online', syncLifecycle)
  channel?.addEventListener('message', handleBroadcastMessage)

  syncLifecycle()

  return {
    stop: () => {
      if (stopped) return
      stopped = true
      ownsLeadership = false
      stopStream()
      clearLeaseRefreshTimer()
      removeLeaseIfOwned(tabId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
      window.removeEventListener('focus', syncLifecycle)
      window.removeEventListener('online', syncLifecycle)
      channel?.removeEventListener('message', handleBroadcastMessage)
      channel?.close()
    },
  }
}
