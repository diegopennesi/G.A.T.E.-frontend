import { useState } from 'react'
import { useCampaignContext } from '../../../context'
import { FieldLabel, Icon } from '../../../shared/components'
import type { CampaignRole } from '../../../types/domain'

export function CampaignMemberProfilePage() {
  const {
    selectedCampaignMember: membership,
    selectedCampaignMemberProfile: profile,
    refreshSelectedCampaignMember: onRefresh,
    updateSelectedMemberRole: onUpdateRole,
    banSelectedMember: onBan,
    suspendSelectedMember: onSuspend,
    unsuspendSelectedMember: onUnsuspend,
    unbanSelectedMember: onUnban,
    approveSelectedMember: onApprove,
  } = useCampaignContext()
  const [role, setRole] = useState<CampaignRole>(membership?.role || 'GIOCATORE')
  const [moderationMode, setModerationMode] = useState<'suspend' | 'ban' | null>(null)
  const [moderationReason, setModerationReason] = useState('')
  if (!membership || !profile) return null

  const roleOptions: CampaignRole[] = ['GIOCATORE', 'CO_MASTER', 'MASTER']
  const activityLabel =
    membership.memberStatus === 'APPROVED'
      ? 'ATTIVO'
      : membership.memberStatus === 'BLOCKED'
        ? 'BLOCCATO'
        : membership.memberStatus === 'BANNED'
          ? 'BANNATO'
          : 'DISABILITATO'
  const activityClass = membership.memberStatus === 'APPROVED' ? 'status-success' : 'status-danger'

  const openModerationModal = (mode: 'suspend' | 'ban') => {
    setModerationMode(mode)
    setModerationReason('')
  }

  const closeModerationModal = () => {
    setModerationMode(null)
    setModerationReason('')
  }

  const confirmModeration = () => {
    const reason = moderationReason.trim()
    if (!reason || reason.length > 200) return
    if (moderationMode === 'suspend') onSuspend(reason)
    if (moderationMode === 'ban') onBan(reason)
    closeModerationModal()
  }

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Profilo Membro Campagna</h2>
        <button type="button" className="secondary-btn" onClick={onRefresh}>
          <Icon name="fa-solid fa-rotate-right" />
          Reload
        </button>
      </div>
      <p className="character-name">{profile.profileName}</p>
      {profile.username && <p className="muted">@{profile.username}</p>}
      <div className="inline-actions">
        <span className="status status-info">{membership.role}</span>
        <span className={`status ${activityClass}`}>{activityLabel}</span>
        <span className="status status-neutral">{membership.memberStatus}</span>
      </div>
      <p className="muted">Stato PG in campagna: {membership.characterStatus || 'N/A'}</p>

      <div className="divider" />
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-shield-halved" label="Ruolo campagna" />
          <select value={role} onChange={(event) => setRole(event.target.value as CampaignRole)}>
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-actions">
          <button type="button" className="primary-btn" onClick={() => onUpdateRole(role)}>
            <Icon name="fa-solid fa-user-gear" />
            Aggiorna ruolo
          </button>
        </div>
      </div>

      <div className="inline-actions">
        {(membership.memberStatus === 'PENDING' || membership.memberStatus === 'REJECTED') && (
          <button type="button" className="primary-btn" onClick={onApprove}>
            <Icon name="fa-solid fa-user-check" />
            Accetta utente
          </button>
        )}
        {membership.memberStatus === 'APPROVED' && (
          <button type="button" className="secondary-btn" onClick={() => openModerationModal('suspend')}>
            <Icon name="fa-solid fa-user-slash" />
            Sospendi utente
          </button>
        )}
        {membership.memberStatus === 'BLOCKED' && (
          <button type="button" className="secondary-btn" onClick={onUnsuspend}>
            <Icon name="fa-solid fa-unlock" />
            Sblocca sospensione
          </button>
        )}
        {membership.memberStatus !== 'BANNED' && membership.memberStatus !== 'PENDING' && (
          <button type="button" className="secondary-btn" onClick={() => openModerationModal('ban')}>
            <Icon name="fa-solid fa-ban" />
            Blocca utente
          </button>
        )}
        {membership.memberStatus === 'BANNED' && (
          <button type="button" className="secondary-btn" onClick={onUnban}>
            <Icon name="fa-solid fa-unlock-keyhole" />
            Sblocca utente
          </button>
        )}
      </div>

      {moderationMode && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <h3>{moderationMode === 'ban' ? 'Motivo ban' : 'Motivo sospensione'}</h3>
            <label>
              <FieldLabel icon="fa-solid fa-comment-dots" label="Motivo (max 200)" />
              <textarea
                rows={4}
                maxLength={200}
                placeholder="Spiega il motivo della moderazione"
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
              />
            </label>
            <p className="muted">{moderationReason.length}/200</p>
            <div className="inline-actions">
              <button type="button" className="secondary-btn" onClick={closeModerationModal}>
                Annulla
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={confirmModeration}
                disabled={moderationReason.trim().length === 0 || moderationReason.trim().length > 200}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
