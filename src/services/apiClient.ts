import type { ErrorPayload } from '../types/domain'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8080/api/v1'

const ACCESS_TOKEN_KEY = 'gate_access_token'
const REFRESH_TOKEN_KEY = 'gate_refresh_token'
const REALM_CODE_KEY = 'gate_realm_code'

let refreshPromise: Promise<void> | null = null

export class ApiError extends Error {
  status: number
  payload?: ErrorPayload

  constructor(message: string, status: number, payload?: ErrorPayload) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getRealmCode() {
  return localStorage.getItem(REALM_CODE_KEY)
}

export function setRealmCode(realmCode: string) {
  localStorage.setItem(REALM_CODE_KEY, realmCode.trim().toLowerCase())
}

export function clearRealmCode() {
  localStorage.removeItem(REALM_CODE_KEY)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const buildHeaders = (token?: string, hasBody = false) => {
  const headers: Record<string, string> = {}
  const realmCode = getRealmCode()?.trim()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (realmCode) {
    headers['X-GATE-Realm-Code'] = realmCode
  }
  if (hasBody) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ErrorPayload | undefined
  try {
    payload = (await response.json()) as ErrorPayload
  } catch {
    payload = undefined
  }
  const message = payload?.message || `Request failed with status ${response.status}`
  return new ApiError(message, response.status, payload)
}

async function runRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new ApiError('Sessione scaduta.', 401)
  }

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    clearTokens()
    throw await parseError(response)
  }

  const data = (await response.json()) as { accessToken: string; refreshToken: string }
  setTokens(data.accessToken, data.refreshToken)
}

async function ensureRefreshed() {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null
    })
  }
  await refreshPromise
}

export async function refreshSession() {
  await ensureRefreshed()
}

export async function apiRequest<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH'
    body?: unknown
    auth?: boolean
    retryOn401?: boolean
  },
): Promise<T> {
  const method = options?.method ?? 'GET'
  const auth = options?.auth ?? true
  const retryOn401 = options?.retryOn401 ?? true
  const token = auth ? getAccessToken() || undefined : undefined
  const hasBody = options?.body !== undefined

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token, hasBody),
    body: hasBody ? JSON.stringify(options?.body) : undefined,
  })

  if (!response.ok) {
    if (response.status === 401 && auth && retryOn401 && getRefreshToken()) {
      await ensureRefreshed()
      return apiRequest<T>(path, { ...options, retryOn401: false })
    }
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function getApiBaseUrl() {
  return BASE_URL
}
