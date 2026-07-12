import { Icon } from '../../../shared/components'
import type { LeaveCampaignContext } from '../../../types/ui'

export function LeaveCampaignModal({
  context,
  busy,
  onClose,
  onConfirm,
}: {
  context: LeaveCampaignContext
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel campaign-leave-panel">
        <div className="modal-panel-head">
          <div>
            <h3>Esci dalla campagna</h3>
            <p className="muted">
              Stai per lasciare <strong>{context.campaignName}</strong>.
            </p>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose} disabled={busy}>
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="leave-warning-box">
          <p className="leave-warning-title">Operazione irreversibile nel contesto attivo</p>
          <p className="muted">
            La tua membership verrà disattivata.
            {context.characterWillBeRetired
              ? ' Il tuo personaggio attivo in questa campagna verrà ritirato.'
              : ' Non hai un personaggio attivo in questa campagna, quindi verrà solo rimosso il contesto.'}
            Dopo l'uscita non potrai più usare questa campagna come contesto attivo finché non avrai una nuova membership approvata.
          </p>
        </div>

        <div className="inline-actions">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={busy}>
            Annulla
          </button>
          <button type="button" className="danger-btn" onClick={onConfirm} disabled={busy}>
            Esci dalla campagna
          </button>
        </div>
      </div>
    </div>
  )
}
