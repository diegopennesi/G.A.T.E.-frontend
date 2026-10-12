import { useState } from 'react'
import { Dialog } from 'primereact/dialog'
import { useCampaignContext } from '../../../context'
import { useAsyncAction } from '../../../hooks/useAsyncAction'
import { useUnsavedChanges } from '../../../context/NavigationGuardContext'
import type { CampaignRole } from '../../../types/domain'

const roles = { GIOCATORE: 'Giocatore', CO_MASTER: 'Co-master', MASTER: 'Master', SUPER_MASTER: 'Super master' }
const statuses = { APPROVED: 'Attivo', PENDING: 'In attesa', REJECTED: 'Accesso rifiutato', BLOCKED: 'Sospeso', BANNED: 'Bloccato' }
export function CampaignMemberProfilePage() {
  const { selectedCampaignMember: member, selectedCampaignMemberProfile: profile, currentUserId, membershipRole, refreshSelectedCampaignMember, updateSelectedMemberRole, banSelectedMember, suspendSelectedMember, unsuspendSelectedMember, unbanSelectedMember, approveSelectedMember } = useCampaignContext()
  const [role, setRole] = useState<CampaignRole>(member?.role || 'GIOCATORE')
  const [mode, setMode] = useState<'ban' | 'suspend' | null>(null)
  const [reason, setReason] = useState('')
  const action = useAsyncAction()
  useUnsavedChanges(Boolean(mode && reason) || Boolean(member && role !== member.role), action.pending)
  if (!member || !profile) return null
  const protectedMember = member.userId === currentUserId || member.role === 'SUPER_MASTER'
  const options: CampaignRole[] = membershipRole === 'MASTER' ? ['GIOCATORE', 'CO_MASTER'] : ['GIOCATORE', 'CO_MASTER', 'MASTER']
  const run = (task: () => Promise<unknown>, message: string) => void action.execute(task, message)
  const close = () => { if (!action.pending) { setMode(null); setReason('') } }
  return <section className="panel remaining-flow member-profile">
    <header className="flow-header"><h2>{profile.profileName || profile.username}</h2><p className="muted">@{profile.username} · {roles[member.role]} · {statuses[member.memberStatus] || member.memberStatus}</p><button type="button" className="secondary-btn" disabled={action.pending || role !== member.role} onClick={() => run(refreshSelectedCampaignMember, 'Profilo aggiornato.')}>Aggiorna profilo membro</button></header>
    {member.moderationReason && <p className="muted">Motivo: {member.moderationReason}</p>}
    {!mode && action.error && <p role="alert">{action.error}</p>}{action.notice && <p role="status">{action.notice}</p>}
    {protectedMember ? <p className="muted">Il tuo account e il super master non si gestiscono con le azioni di moderazione. Per cambiare proprietario usa Gestione campagna.</p> : <>
      <form className="settings-section" onSubmit={event => { event.preventDefault(); run(() => updateSelectedMemberRole(role), 'Ruolo aggiornato.') }}><h3>Ruolo al tavolo</h3><fieldset className="flow-fieldset" disabled={action.pending}><label>Ruolo campagna<select value={role} onChange={event => setRole(event.target.value as CampaignRole)}>{options.map(option => <option key={option} value={option}>{roles[option]}</option>)}</select></label><button type="submit" className="secondary-btn" disabled={role === member.role}>Aggiorna ruolo</button></fieldset></form>
      <section className="settings-section"><h3>Accesso e moderazione</h3><p className="muted">Per sospendere o bloccare l’accesso devi indicare un motivo.</p><div className="inline-actions">
        {(member.memberStatus === 'PENDING' || member.memberStatus === 'REJECTED') && <button type="button" className="primary-btn" disabled={action.pending} onClick={() => run(approveSelectedMember, 'Accesso approvato.')}>Approva accesso</button>}
        {member.memberStatus === 'APPROVED' && <button type="button" className="secondary-btn" disabled={action.pending} onClick={() => { action.setError(''); setMode('suspend') }}>Sospendi accesso</button>}
        {member.memberStatus === 'BLOCKED' && <button type="button" className="secondary-btn" disabled={action.pending} onClick={() => run(unsuspendSelectedMember, 'Sospensione rimossa.')}>Rimuovi sospensione</button>}
        {member.memberStatus !== 'BANNED' && member.memberStatus !== 'PENDING' && <button type="button" className="danger-btn" disabled={action.pending} onClick={() => { action.setError(''); setMode('ban') }}>Blocca accesso</button>}
        {member.memberStatus === 'BANNED' && <button type="button" className="secondary-btn" disabled={action.pending} onClick={() => run(unbanSelectedMember, 'Blocco rimosso.')}>Rimuovi blocco</button>}
      </div></section>
    </>}
    <Dialog visible={Boolean(mode)} modal header={mode === 'ban' ? 'Blocca accesso alla campagna' : 'Sospendi accesso alla campagna'} className="confirm-action-dialog" onHide={close} closable={!action.pending} closeOnEscape={!action.pending} draggable={false} resizable={false}>
      <form onSubmit={event => { event.preventDefault(); if (!reason.trim() || !mode) return; void action.execute(async () => { await (mode === 'ban' ? banSelectedMember : suspendSelectedMember)(reason.trim()); setMode(null); setReason('') }, 'Accesso aggiornato.') }} aria-busy={action.pending}><fieldset className="flow-fieldset" disabled={action.pending}><label>Motivo della moderazione<textarea required maxLength={200} rows={4} value={reason} onChange={event => setReason(event.target.value)} /></label><p className="muted">{reason.length}/200 caratteri</p><div className="inline-actions"><button type="button" className="secondary-btn" onClick={close}>Annulla</button><button type="submit" className="danger-btn" disabled={!reason.trim()}>{action.pending ? 'Elaborazione…' : 'Conferma'}</button></div></fieldset>{action.error && <p role="alert">{action.error}</p>}</form>
    </Dialog>
  </section>
}
