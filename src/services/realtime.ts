import { getApiBaseUrl, getAccessToken, getRealmCode, refreshSession } from './apiClient'
import type { ResourceInvalidationPayload } from '../types/realtime'

type StreamMessage = {
  event: string
  data: string
}

type StreamOptions = {
  onInvalidate: (payload: ResourceInvalidationPayload) => void
  onUnauthorized: () => void
  onError?: (message: string) => void
  onOpen?: () => void
}

const CLEAN_CLOSE_RECONNECT_DELAY_MS = 30_000
const MAX_RETRIES = 5
const MAX_WAIT_MS = 30_000

function parseSseMessages(buffer: string): { messages: StreamMessage[]; remainder: string } {
  const rawChunks = buffer.split(/\r?\n\r?\n/)
  const remainder = rawChunks.pop() || ''
  const messages: StreamMessage[] = []

  for (const chunk of rawChunks) {
    const lines = chunk.split(/\r?\n/)
    let event = 'message'
    const dataLines: string[] = []

    for (const line of lines) {
      if (!line || line.startsWith(':')) continue
      const separatorIndex = line.indexOf(':')
      const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line
      const value = separatorIndex >= 0 ? line.slice(separatorIndex + 1).replace(/^ /, '') : ''

      if (field === 'event') {
        event = value || event
      } else if (field === 'data') {
        dataLines.push(value)
      }
    }

    if (dataLines.length > 0) {
      messages.push({ event, data: dataLines.join('\n') })
    }
  }

  return { messages, remainder }
}

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onMessage: (message: StreamMessage) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parsed = parseSseMessages(buffer)
      buffer = parsed.remainder
      for (const message of parsed.messages) {
        onMessage(message)
      }
    }

    const tail = buffer + decoder.decode()
    const parsed = parseSseMessages(`${tail}\n\n`)
    for (const message of parsed.messages) {
      onMessage(message)
    }
  } finally {
    reader.releaseLock()
  }
}

export function connectResourceInvalidationStream(options: StreamOptions) {
  const abortController = new AbortController()
  let retryTimer: number | null = null
  let stopped = false
  let retryCount = 0

  const clearRetryTimer = () => {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  const scheduleReconnect = (delayMs = 0, countRetry = true) => {
    if (stopped) return
    clearRetryTimer()

    if (!countRetry) {
      // Clean close (server timeout) or post-refresh reconnect: reset backoff state.
      retryCount = 0
      const backoff = delayMs > 0 ? Math.min(delayMs, MAX_WAIT_MS) : 0
      if (backoff > 0) {
        console.log(`SSE: reconnecting in ${backoff}ms after clean close (retry count reset)`)
      }
      retryTimer = window.setTimeout(() => {
        void connect()
      }, backoff)
      return
    }

    if (retryCount >= MAX_RETRIES) {
      console.warn('SSE: max retries reached, stopping reconnection attempts')
      return
    }

    retryCount += 1
    const backoff = delayMs > 0 ? Math.min(delayMs, MAX_WAIT_MS) : Math.min(1000 * 2 ** retryCount, MAX_WAIT_MS)
    console.log(`SSE: reconnecting in ${backoff}ms (attempt ${retryCount}/${MAX_RETRIES})`)
    retryTimer = window.setTimeout(() => {
      void connect()
    }, backoff)
  }

  const connect = async () => {
    if (stopped || abortController.signal.aborted) return

    const accessToken = getAccessToken()
    if (!accessToken) return

    try {
      const response = await fetch(`${getApiBaseUrl()}/realtime/events`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream',
          ...(getRealmCode()?.trim() ? { 'X-GATE-Realm-Code': getRealmCode()!.trim() } : {}),
        },
        signal: abortController.signal,
      })

      if (response.status === 401) {
        try {
          await refreshSession()
          scheduleReconnect(0, false)
        } catch {
          options.onUnauthorized()
        }
        return
      }

      if (!response.ok || !response.body) {
        throw new Error(`Realtime stream failed with status ${response.status}`)
      }

      retryCount = 0
      options.onOpen?.()

      await consumeStream(response.body, (message) => {
        if (message.event !== 'resource.invalidated') return
        try {
          const payload = JSON.parse(message.data) as ResourceInvalidationPayload
          options.onInvalidate(payload)
        } catch {
          // Messaggio non valido: lo ignoriamo e continuiamo.
        }
      })

      scheduleReconnect(CLEAN_CLOSE_RECONNECT_DELAY_MS, false)
    } catch (error) {
      if (stopped || abortController.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Realtime stream interrotto'
      options.onError?.(message)

      scheduleReconnect()
    }
  }

  void connect()

  return () => {
    stopped = true
    clearRetryTimer()
    abortController.abort()
  }
}
