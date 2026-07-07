import { useState } from 'react'
import { FieldLabel, Icon } from '../../../shared/components'
import type { UserProfile } from '../../../types/domain'
import { toMessage } from '../../../shared/utils'

export type ProfileDraft = {
  profileName: string
  bio: string
  whatsapp: string
  instagram: string
  otherSocial: string
}

function profileToDraft(profile: UserProfile): ProfileDraft {
  return {
    profileName: profile.profileName || '',
    bio: profile.bio || '',
    whatsapp: profile.whatsapp || '',
    instagram: profile.socialLinks.instagram || '',
    otherSocial: profile.socialLinks.other || '',
  }
}


export function ProfilePage({
  profile,
  onGoEdit,
}: {
  profile: UserProfile
  onGoEdit: () => void
}) {
  const displayValue = (value: string | null | undefined) => (value && value.trim() ? value : 'Non impostato')
  const avatarLabel = profile.profileName?.trim() || profile.username?.trim() || 'U'
  return (
    <section className="panel profile-shell">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {avatarLabel.slice(0, 2).toUpperCase()}
        </div>
        <div className="profile-header-copy">
          <p className="profile-kicker">Profilo utente</p>
          <h2>{displayValue(profile.profileName)}</h2>
          <p className="muted">{displayValue(profile.username ? `@${profile.username}` : null)}</p>
        </div>
        <div className="profile-header-actions">
          <button type="button" className="primary-btn" onClick={onGoEdit}>
            <Icon name="fa-solid fa-pen-to-square" />
            <span>Modifica profilo</span>
          </button>
        </div>
      </div>

      <div className="profile-grid">
        <article className="profile-card">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-user" className="profile-card-icon" />
            <p className="profile-card-label">Nome profilo</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.profileName)}</p>
        </article>

        <article className="profile-card">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-at" className="profile-card-icon" />
            <p className="profile-card-label">Username</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.username ? `@${profile.username}` : null)}</p>
        </article>

        <article className="profile-card profile-card-wide">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-quote-left" className="profile-card-icon" />
            <p className="profile-card-label">Bio</p>
          </div>
          <p className="profile-card-value profile-card-body">{displayValue(profile.bio)}</p>
        </article>

        <article className="profile-card">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-phone" className="profile-card-icon" />
            <p className="profile-card-label">WhatsApp</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.whatsapp)}</p>
        </article>

        <article className="profile-card">
          <div className="profile-card-head">
            <Icon name="fa-brands fa-instagram" className="profile-card-icon" />
            <p className="profile-card-label">Instagram</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.socialLinks.instagram)}</p>
        </article>

        <article className="profile-card profile-card-wide">
          <div className="profile-card-head">
            <Icon name="fa-solid fa-link" className="profile-card-icon" />
            <p className="profile-card-label">Altro social</p>
          </div>
          <p className="profile-card-value">{displayValue(profile.socialLinks.other)}</p>
        </article>
      </div>

      <p className="profile-footnote muted">I campi vuoti vengono mostrati esplicitamente per evitare ambiguità nel profilo.</p>
    </section>
  )
}

export function EditProfilePage({
  profile,
  onSave,
  onChangePassword,
}: {
  profile: UserProfile
  onSave: (draft: ProfileDraft) => void
  onChangePassword: (params: { currentPassword: string; newPassword: string }) => Promise<void>
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => profileToDraft(profile))
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordInfo, setPasswordInfo] = useState('')

  const submitPasswordChange = async () => {
    setPasswordError('')
    setPasswordInfo('')
    if (newPassword !== confirmPassword) {
      setPasswordError('La nuova password e la conferma non coincidono.')
      return
    }

    setPasswordBusy(true)
    try {
      await onChangePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordInfo('Password aggiornata con successo.')
    } catch (err) {
      setPasswordError(toMessage(err))
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2>Modifica Profilo</h2>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-solid fa-user" label="Profile Name" />
          <input
            placeholder="Nome profilo"
            value={draft.profileName}
            onChange={(event) => setDraft((prev) => ({ ...prev, profileName: event.target.value }))}
          />
        </label>
        <label>
          <FieldLabel icon="fa-brands fa-whatsapp" label="WhatsApp" />
          <input
            placeholder="Numero o contatto WhatsApp"
            value={draft.whatsapp}
            onChange={(event) => setDraft((prev) => ({ ...prev, whatsapp: event.target.value }))}
          />
        </label>
      </div>
      <label>
        <FieldLabel icon="fa-solid fa-quote-left" label="Bio" />
        <textarea
          rows={4}
          placeholder="Breve presentazione del tuo profilo"
          value={draft.bio}
          onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
        />
      </label>
      <div className="form-grid">
        <label>
          <FieldLabel icon="fa-brands fa-instagram" label="Instagram" />
          <input
            placeholder="@account instagram"
            value={draft.instagram}
            onChange={(event) => setDraft((prev) => ({ ...prev, instagram: event.target.value }))}
          />
        </label>
        <label>
          <FieldLabel icon="fa-solid fa-link" label="Altro social" />
          <input
            placeholder="Link o nickname"
            value={draft.otherSocial}
            onChange={(event) => setDraft((prev) => ({ ...prev, otherSocial: event.target.value }))}
          />
        </label>
      </div>
      <button type="button" className="primary-btn" onClick={() => onSave(draft)}>
        <Icon name="fa-solid fa-floppy-disk" />
        Salva
      </button>
      <div className="divider" />
      <div className="profile-password-block">
        <div className="row-between">
          <h3 className="section-title">Cambio password</h3>
          <span className="status status-info">Protetto</span>
        </div>
        <p className="muted">Usa la password attuale per aggiornare le credenziali e invalidare le sessioni precedenti.</p>
        <label>
          <FieldLabel icon="fa-solid fa-key" label="Password corrente" />
          <input
            type="password"
            placeholder="Password corrente"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            <FieldLabel icon="fa-solid fa-lock" label="Nuova password" />
            <input
              type="password"
              placeholder="Nuova password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <label>
            <FieldLabel icon="fa-solid fa-lock" label="Conferma nuova password" />
            <input
              type="password"
              placeholder="Ripeti la nuova password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
        </div>
        {passwordError && <p className="form-error">{passwordError}</p>}
        {passwordInfo && <p className="auth-note">{passwordInfo}</p>}
        <button type="button" className="secondary-btn" disabled={passwordBusy} onClick={() => void submitPasswordChange()}>
          <Icon name="fa-solid fa-unlock-keyhole" />
          {passwordBusy ? 'Attendere...' : 'Aggiorna password'}
        </button>
      </div>
    </section>
  )
}
