import { useState } from 'react'
import { useProfileContext, useUiContext } from '../../../context'
import { useAsyncAction } from '../../../hooks/useAsyncAction'
import { useUnsavedChanges } from '../../../context/NavigationGuardContext'
import { profileToDraft, EMPTY_PROFILE } from '../profileDraft'
import { Icon } from '../../../shared/components'

export function EditProfilePage() {
  const { profile, saveProfile, changePassword } = useProfileContext()
  const { goToScreen } = useUiContext()
  const [draft, setDraft] = useState(() => profileToDraft(profile || EMPTY_PROFILE))
  const [initial] = useState(() => JSON.stringify(draft))
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const profileAction = useAsyncAction()
  const passwordAction = useAsyncAction()
  const dirty = JSON.stringify(draft) !== initial
  const busy = profileAction.pending || passwordAction.pending
  useUnsavedChanges(dirty || Boolean(currentPassword || newPassword || confirmPassword), busy)
  if (!profile) return null
  return <section className="panel remaining-flow profile-editor">
    <header className="flow-header"><button type="button" className="secondary-btn" disabled={busy} onClick={() => goToScreen('Profilo')}>Torna al profilo</button><h2>Modifica profilo</h2><p className="muted">Scegli come presentarti al gruppo. I contatti sono facoltativi.</p></header>
    <form onSubmit={event => { event.preventDefault(); void profileAction.execute(() => saveProfile(draft), 'Profilo salvato.') }} aria-busy={profileAction.pending}>
      <fieldset className="flow-fieldset" disabled={busy}>
        <label>Nome visibile<input maxLength={100} autoComplete="nickname" value={draft.profileName} onChange={event => setDraft(previous => ({ ...previous, profileName: event.target.value }))} /></label>
        <label>Email per il recupero password<input required type="email" maxLength={254} autoComplete="email" value={draft.email} onChange={event => setDraft(previous => ({ ...previous, email: event.target.value }))} /></label>
        <label>Presentazione<textarea rows={4} maxLength={500} value={draft.bio} onChange={event => setDraft(previous => ({ ...previous, bio: event.target.value }))} /></label>
        <details className="flow-details"><summary>Contatti e social (facoltativi)</summary>
          <div className="form-grid"><label>WhatsApp<input type="tel" autoComplete="tel" value={draft.whatsapp} onChange={event => setDraft(previous => ({ ...previous, whatsapp: event.target.value }))} /></label><label>Instagram<input value={draft.instagram} placeholder="Nome account o link" onChange={event => setDraft(previous => ({ ...previous, instagram: event.target.value }))} /></label><label>Altro social<input value={draft.otherSocial} placeholder="Link o nome account" onChange={event => setDraft(previous => ({ ...previous, otherSocial: event.target.value }))} /></label></div>
        </details>
        <div className="flow-save-bar"><button type="submit" className="primary-btn" disabled={!dirty}><Icon name="fa-solid fa-floppy-disk" />{profileAction.pending ? 'Salvataggio…' : 'Salva profilo'}</button></div>
      </fieldset>
      {profileAction.error && <p role="alert">{profileAction.error}</p>}
    </form>
    <details className="flow-details profile-password-block"><summary>Cambio password</summary><p className="muted">Usa la password attuale. La nuova password deve contenere almeno 8 caratteri.</p>
      <form onSubmit={event => {
        event.preventDefault()
        if (newPassword !== confirmPassword) { passwordAction.setError('La nuova password e la conferma non coincidono.'); return }
        void passwordAction.execute(async () => { await changePassword({ currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }, 'Password aggiornata. Le sessioni precedenti sono state invalidate.')
      }} aria-busy={passwordAction.pending}>
        <fieldset className="flow-fieldset" disabled={busy}>
          <label>Password attuale<input type="password" required autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
          <div className="form-grid"><label>Nuova password<input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label><label>Conferma nuova password<input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label></div>
          <button type="submit" className="secondary-btn">{passwordAction.pending ? 'Aggiornamento…' : 'Aggiorna password'}</button>
        </fieldset>
        {passwordAction.error && <p role="alert">{passwordAction.error}</p>}{passwordAction.notice && <p role="status">{passwordAction.notice}</p>}
      </form>
    </details>
  </section>
}
