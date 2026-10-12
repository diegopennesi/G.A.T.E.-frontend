import { useProfileContext, useUiContext } from '../../../context'
import { Icon } from '../../../shared/components'

export type { ProfileDraft } from '../profileDraft'

export function ProfilePage() {
  const { profile } = useProfileContext()
  const { goToScreen } = useUiContext()
  if (!profile) return null
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
          <button type="button" className="primary-btn" onClick={() => goToScreen('Modifica Profilo')}>
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

export { EditProfilePage } from './EditProfilePage'
