import type { Dispatch, SetStateAction } from 'react'
import type { AdminRealmCreateRequest, RealmMobileFeature, RealmMobileTheme } from '../../../types/domain'

const featureOptions: { value: RealmMobileFeature; label: string; description: string }[] = [
  { value: 'CAMPAGNE', label: 'Campagne', description: 'Elenco e dettaglio dei tavoli' },
  { value: 'PERSONAGGI', label: 'Personaggi', description: 'Schede e personaggi del reame' },
  { value: 'MISSIONI', label: 'Missioni', description: 'Sessioni, iscrizioni e calendario' },
  { value: 'CHAT', label: 'Chat', description: 'Conversazioni delle sessioni' },
]

function luminance(hex: string) {
  const channels = [1, 3, 5].map((position) => Number.parseInt(hex.slice(position, position + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((left, right) => right - left)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

export function RealmBrandingEditor({ draft, onChange }: {
  draft: AdminRealmCreateRequest
  onChange: Dispatch<SetStateAction<AdminRealmCreateRequest>>
}) {
  const accentValid = /^#[0-9a-f]{6}$/i.test(draft.accentColor ?? '')
  const accent = accentValid ? draft.accentColor! : '#245A45'
  const foreground = contrast(accent, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#000000'
  const previewDark = draft.theme === 'DARK'
  const toggleFeature = (feature: RealmMobileFeature) => onChange((current) => ({
    ...current,
    features: current.features.includes(feature)
      ? current.features.filter((item) => item !== feature)
      : [...current.features, feature],
  }))

  return <section className="realm-branding-editor" aria-labelledby="realm-branding-title">
    <div className="realm-branding-copy">
      <p className="menu-group-label">Identità nell’app</p>
      <h3 id="realm-branding-title">Aspetto white-label</h3>
      <p className="muted">Queste impostazioni cambiano login, home e navigazione dell’app per chi entra in questo reame.</p>
    </div>

    <div className="realm-branding-layout">
      <div className="realm-branding-fields">
        <div className="form-grid two-cols">
          <label className="full-span">
            Descrizione breve
            <textarea rows={3} maxLength={280} value={draft.description ?? ''}
              placeholder="Il punto di ritrovo digitale del Dragon Legend."
              onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))} />
            <small>{draft.description?.length ?? 0}/280 · compare nella scelta del reame</small>
          </label>
          <label>
            Tema dell’app
            <select value={draft.theme} onChange={(event) => onChange((current) => ({
              ...current, theme: event.target.value as RealmMobileTheme,
            }))}>
              <option value="SYSTEM">Segui il telefono</option>
              <option value="LIGHT">Sempre chiaro</option>
              <option value="DARK">Sempre scuro</option>
            </select>
          </label>
          <label>
            Colore principale
            <span className="realm-color-control">
              <input type="color" aria-label="Seleziona colore principale" value={accent}
                onChange={(event) => onChange((current) => ({ ...current, accentColor: event.target.value.toUpperCase() }))} />
              <input value={draft.accentColor ?? ''} placeholder="#245A45" maxLength={7}
                aria-invalid={!accentValid}
                onChange={(event) => onChange((current) => ({ ...current, accentColor: event.target.value.toUpperCase() }))} />
            </span>
            <small className={!accentValid ? 'field-error' : ''}>{accentValid ? `Testo pulsanti: ${foreground === '#FFFFFF' ? 'bianco' : 'nero'} automatico` : 'Usa il formato #RRGGBB'}</small>
          </label>
          <label className="full-span">
            Copertina URL
            <input value={draft.coverImageUrl ?? ''} placeholder="https://cdn.example.com/dragonlegend-cover.jpg"
              onChange={(event) => onChange((current) => ({ ...current, coverImageUrl: event.target.value }))} />
            <small>Immagine orizzontale consigliata, almeno 1200 × 600 px.</small>
          </label>
        </div>

        <label className="switch system-user-switch realm-discovery-switch" aria-label="Reame ricercabile">
          <span className="system-status-copy">
            <strong>{draft.isDiscoverable ? 'Visibile nella ricerca' : 'Accesso solo con codice o QR'}</strong>
            <small>La disattivazione non rimuove campagne o utenti già presenti.</small>
          </span>
          <span><input type="checkbox" checked={draft.isDiscoverable}
            onChange={(event) => onChange((current) => ({ ...current, isDiscoverable: event.target.checked }))} />
            <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span></span>
        </label>

        <fieldset className="realm-feature-fieldset">
          <legend>Sezioni disponibili nell’app</legend>
          <div className="realm-feature-grid">
            {featureOptions.map((feature) => <label key={feature.value} className={draft.features.includes(feature.value) ? 'is-selected' : ''}>
              <input type="checkbox" checked={draft.features.includes(feature.value)} onChange={() => toggleFeature(feature.value)} />
              <span><strong>{feature.label}</strong><small>{feature.description}</small></span>
            </label>)}
          </div>
        </fieldset>
      </div>

      <div className="realm-phone-preview" style={{
        backgroundColor: previewDark ? '#101A16' : '#F5F6F2',
        color: previewDark ? '#EDF4EE' : '#172B24',
      }}>
        {draft.coverImageUrl?.trim() ? <img className="realm-phone-cover" src={draft.coverImageUrl} alt="Anteprima copertina" /> :
          <div className="realm-phone-cover-placeholder" style={{ backgroundColor: accent }} />}
        <div className="realm-phone-content">
          <div className="realm-phone-brand">
            {draft.logoUrl?.trim() ? <img src={draft.logoUrl} alt="Anteprima logo" /> : <span style={{ backgroundColor: accent, color: foreground }}>{draft.name.trim().slice(0, 1).toUpperCase() || 'G'}</span>}
            <div><small>REAME ATTIVO</small><strong>{draft.name.trim() || 'Nome del reame'}</strong></div>
          </div>
          <p>{draft.description?.trim() || 'La descrizione accompagnerà gli utenti nella loro esperienza.'}</p>
          <button type="button" tabIndex={-1} style={{ backgroundColor: accent, color: foreground }}>Entra nel reame</button>
          <div className="realm-phone-feature-list">
            {featureOptions.filter((feature) => draft.features.includes(feature.value)).map((feature) => <span key={feature.value}>{feature.label}</span>)}
          </div>
        </div>
      </div>
    </div>
  </section>
}
