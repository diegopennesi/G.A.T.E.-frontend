export interface ResourceInvalidationPayload {
  reason: string
  keys: string[]
  occurredAt: string
}

export interface StreamReadyPayload {
  connectionId: string
  connectedAt: string
}

export interface StreamHeartbeatPayload {
  sentAt: string
}
