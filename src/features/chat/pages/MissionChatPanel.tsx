import { useId, useRef, useState } from 'react'
import { Icon } from '../../../shared/components'
import { toMessage } from '../../../shared/utils'
import type { MissionChatResponse } from '../../../types/domain'

type MissionChatPanelProps = {
  chat: MissionChatResponse | null
  busy: boolean
  error: string
  currentUserId: string
  onClose: () => void
  onSend: (body: string) => Promise<void>
  showCloseAction?: boolean
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

export function MissionChatPanel({ chat, busy, error, currentUserId, onClose, onSend, showCloseAction = true }: MissionChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const sendLock = useRef(false)
  const composeId = useId()
  const canSend = draft.trim().length > 0 && !busy && !sending && Boolean(chat)

  const send = async () => {
    const body = draft.trim()
    if (!canSend || sendLock.current) return
    sendLock.current = true
    setSending(true)
    setSendError('')
    try {
      await onSend(body)
      setDraft('')
    } catch (err) {
      setSendError(`${toMessage(err)} Il testo è stato conservato: puoi riprovare.`)
    } finally {
      sendLock.current = false
      setSending(false)
    }
  }

  return (
    <section className="subpanel mission-chat-panel" aria-label="Chat missione">
      <div className="row-between mission-chat-head">
        <div>
          <h3 className="section-title">{chat?.room.title || 'Chat missione'}</h3>
          <p className="muted">Bacheca della missione visibile solo a creatore, titolari e panchina.</p>
        </div>
        {showCloseAction && (
          <div className="inline-actions">
            <button type="button" className="mission-chat-action-btn mission-chat-summary-btn" onClick={onClose}>
              <Icon name="fa-solid fa-table-list" />
              Riepilogo
            </button>
          </div>
        )}
      </div>

      {(sendError || error) && <p className="form-error" role="alert">{sendError || error}</p>}
      {busy && !chat && <p className="muted">Caricamento chat...</p>}

      {chat && (
        <>
          <div className="mission-chat-messages" role="log" aria-label="Messaggi della missione" aria-live="polite" aria-relevant="additions">
            {chat.messages.length === 0 && <p className="muted">Nessun messaggio in questa missione.</p>}
            {chat.messages.map((message) => {
              const mine = message.authorUserId === currentUserId
              return (
                <article key={message.id} className={`mission-chat-message ${mine ? 'is-mine' : ''}`}>
                  <div className="mission-chat-message-meta">
                    <div className="mission-chat-author">
                      <div className="mission-chat-author-line">
                        {message.authorCharacterName && (
                          <>
                            <strong className="mission-chat-character-name">{message.authorCharacterName}</strong>
                            <span className="mission-chat-author-separator">-</span>
                          </>
                        )}
                        <strong className="mission-chat-profile-name">{message.authorProfileName || message.authorName}</strong>
                      </div>
                      <span className="mission-chat-role-chip">{formatAuthorBadge(message.authorBadge)}</span>
                    </div>
                    <span>{formatChatTimestamp(message.createdAt)}</span>
                  </div>
                  <p className="mission-chat-message-body">{message.body}</p>
                </article>
              )
            })}
          </div>
          <div className="mission-chat-compose" aria-busy={sending}>
            <textarea
              aria-label="Messaggio alla missione"
              aria-describedby={composeId}
              disabled={sending}
              rows={2}
              value={draft}
              maxLength={100}
              placeholder="Scrivi un messaggio..."
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="button"
              className="mission-chat-action-btn mission-chat-send-btn"
              disabled={!canSend}
              onClick={() => void send()}
            >
              <Icon name="fa-solid fa-paper-plane" />
              {sending ? 'Invio...' : 'Invia'}
            </button>
          </div>
          <p id={composeId} className="muted">{draft.length}/100 caratteri</p>
        </>
      )}
    </section>
  )
}
