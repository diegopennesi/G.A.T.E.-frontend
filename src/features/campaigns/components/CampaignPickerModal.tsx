import { Icon } from '../../../shared/components'
import type { CampaignPickerCampaign, Screen } from '../../../types/ui'
import { SCREEN_LABELS } from '../../../types/ui'

export function CampaignPickerModal({
  campaigns,
  targetScreen,
  busy,
  onClose,
  onSelect,
}: {
  campaigns: CampaignPickerCampaign[]
  targetScreen: Screen | null
  busy: boolean
  onClose: () => void
  onSelect: (campaign: CampaignPickerCampaign) => void
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel campaign-picker-panel">
        <div className="modal-panel-head">
          <div>
            <h3>Seleziona campagna</h3>
            <p className="muted">
              {targetScreen
                ? `Carica prima una campagna per aprire ${SCREEN_LABELS[targetScreen].toLowerCase()}.`
                : 'Le campagne disattivate restano visibili ma non sono selezionabili.'}
            </p>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>
            <Icon name="fa-solid fa-xmark" />
          </button>
        </div>

        {campaigns.length > 0 ? (
          <div className="campaign-picker-list">
            {campaigns.map((campaign) => (
              <button
                key={campaign.campaignId}
                type="button"
                className={`campaign-picker-item ${campaign.disabled ? 'is-disabled' : ''}`}
                onClick={() => onSelect(campaign)}
                disabled={busy || campaign.disabled}
                aria-disabled={busy || campaign.disabled}
                title={campaign.disabled ? 'Campagna disattivata: non selezionabile' : undefined}
              >
                <div className="campaign-picker-main">
                  <p className="campaign-picker-name">
                    {campaign.campaignName}
                    {!campaign.isActive && <span className="campaign-picker-badge">Disattivata</span>}
                  </p>
                  <p className="campaign-picker-meta">{campaign.role.replaceAll('_', ' ')}</p>
                </div>
                <Icon name="fa-solid fa-chevron-right" className="campaign-picker-icon" />
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">Nessuna campagna disponibile. Entra in una campagna dalla Lista Campagne.</p>
        )}
      </div>
    </div>
  )
}
