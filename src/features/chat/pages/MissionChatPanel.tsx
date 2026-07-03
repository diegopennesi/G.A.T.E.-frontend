import { useState } from 'react'
import { Icon } from '../../../shared/components'
import type { ChatMessageResponse, MissionChatResponse } from '../../../types/domain'

type MissionChatPanelProps = {
  chat: MissionChatResponse | null
  busy: boolean
  error: string
  currentUserId: string
  onClose: () => void
  onRefresh: () => void
  onSend: (body: string) => void
}

function formatChatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatAuthorBadge(value: string) {
  switch (value) {
    case 'GIOCATORE':
      return 'giocatore'
    case 'CO_MASTER':
      return 'co_master'
    case 'SUPER_MASTER':
      return 'super_master'
    case 'MASTER':
      return 'master'
    case 'SYSTEM':
      return 'System'
    default:
      return value.toLowerCase()
  }
}

function formatAuthorName(message: ChatMessageResponse) {
  const baseName = message.authorCharacterName
    ? `${message.authorCharacterName} - ${message.authorProfileName}`
    : message.authorProfileName || message.authorName
  return `${baseName} - ${formatAuthorBadge(message.authorBadge)}`
}

export function MissionChatPanel({ chat, busy, error, currentUserId, onClose, onRefresh, onSend }: MissionChatPanelProps) {
  const [draft, setDraft] = useState('')
  const canSend = draft.trim().length > 0 && !busy && Boolean(chat)

  return (
    <section className="subpanel mission-chat-panel" aria-label="Chat missione">
      <div className="row-between mission-chat-head">
        <div>
          <h3 className="section-title">{chat?.room.title || 'Chat missione'}</h3>
          <p className="muted">Bacheca della missione visibile solo a creatore, titolari e panchina.</p>
        </div>
        <div className="inline-actions">
          <button type="button" className="secondary-btn mission-chat-icon-btn" onClick={onRefresh} disabled={busy || !chat}>
            <Icon name="fa-solid fa-rotate" />
          </button>
          <button type="button" className="secondary-btn" onClick={onClose}>
            <Icon name="fa-solid fa-table-list" />
            Riepilogo
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {busy && !chat && <p className="muted">Caricamento chat...</p>}

      {chat && (
        <>
          <div className="mission-chat-messages">
            {chat.messages.length === 0 && <p className="muted">Nessun messaggio in questa missione.</p>}
            {chat.messages.map((message) => {
              const mine = message.authorUserId === currentUserId
              return (
                <article key={message.id} className={`mission-chat-message ${mine ? 'is-mine' : ''}`}>
                  <div className="mission-chat-message-meta">
                    <strong>{formatAuthorName(message)}</strong>
                    <span>{formatChatTimestamp(message.createdAt)}</span>
                  </div>
                  <p className="mission-chat-message-body">{message.body}</p>
                </article>
              )
            })}
          </div>
          <div className="mission-chat-compose">
            <textarea
              rows={3}
              value={draft}
              maxLength={2000}
              placeholder="Scrivi un messaggio..."
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="button"
              className="primary-btn"
              disabled={!canSend}
              onClick={() => {
                const body = draft.trim()
                if (!body) return
                onSend(body)
                setDraft('')
              }}
            >
              <Icon name="fa-solid fa-paper-plane" />
              Invia
            </button>
          </div>
        </>
      )}
    </section>
  )
}
