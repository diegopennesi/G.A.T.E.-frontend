import { Icon } from '../../../shared/components'
import type { CampaignDiscoverResponse } from '../../../types/domain'

type CampaignAccessBadgeKind = 'edit' | 'player' | 'outside' | 'pending' | 'blocked' | 'banned'

function CampaignAccessIcon({ kind }: { kind: CampaignAccessBadgeKind }) {
  const commonProps = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  switch (kind) {
    case 'edit':
      return (
        <svg {...commonProps}>
          <path d="M12 3.5 19 6v5c0 4.5-2.6 7.9-7 10-4.4-2.1-7-5.5-7-10V6l7-2.5Z" />
          <path d="m14.5 9.5 1 1" />
          <path d="m10 15 4.2-4.2a1.2 1.2 0 0 1 1.7 0l1.3 1.3a1.2 1.2 0 0 1 0 1.7L13 18H10v-3Z" />
        </svg>
      )
    case 'player':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 19c1.1-3.1 3.5-4.7 6.5-4.7s5.4 1.6 6.5 4.7" />
        </svg>
      )
    case 'pending':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.8V12l2.7 1.8" />
        </svg>
      )
    case 'blocked':
      return (
        <svg {...commonProps}>
          <rect x="5" y="10" width="14" height="9" rx="2" />
          <path d="M8.5 10V8.2a3.5 3.5 0 0 1 7 0V10" />
        </svg>
      )
    case 'banned':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      )
    case 'outside':
    default:
      return (
        <svg {...commonProps}>
          <path d="M6 5h8v14H6z" />
          <path d="M14 6.5 18.5 8.8v6.4L14 17.5" />
          <path d="M10.5 12h4.5" />
        </svg>
      )
  }
}

export function CampaignAccessBadge({ item }: { item: CampaignDiscoverResponse }) {
  const badge = (() => {
    if (item.membershipStatus === 'APPROVED') {
      if (item.membershipRole === 'MASTER') {
        return { kind: 'edit' as const, label: 'MASTER', title: 'Ruolo campagna: MASTER' }
      }
      if (item.membershipRole === 'SUPER_MASTER') {
        return { kind: 'edit' as const, label: 'SUPER MASTER', title: 'Ruolo campagna: SUPER MASTER' }
      }
      if (item.membershipRole === 'CO_MASTER') {
        return { kind: 'edit' as const, label: 'CO-MASTER', title: 'Ruolo campagna: CO-MASTER' }
      }
      return { kind: 'player' as const, label: 'GIOCATORE', title: 'Ruolo campagna: GIOCATORE' }
    }
    if (item.membershipStatus === 'PENDING') {
      return { kind: 'pending' as const, label: 'IN ATTESA', title: 'Richiesta di accesso in attesa' }
    }
    if (item.membershipStatus === 'BLOCKED') {
      return { kind: 'blocked' as const, label: 'BLOCCATO', title: 'Membership sospesa' }
    }
    if (item.membershipStatus === 'BANNED') {
      return { kind: 'banned' as const, label: 'BANNATO', title: 'Membership bannata' }
    }
    return { kind: 'outside' as const, label: 'FUORI', title: 'Non fai parte della campagna' }
  })()

  return (
    <span className="campaign-access-badge" title={badge.title} aria-label={badge.title}>
      <span className={`campaign-access-icon is-${badge.kind}`} aria-hidden="true">
        <CampaignAccessIcon kind={badge.kind} />
      </span>
      <span className="campaign-access-label">{badge.label}</span>
    </span>
  )
}

export function CampaignStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`campaign-status-badge ${isActive ? 'is-active' : 'is-disabled'}`}>
      {isActive ? 'Attiva' : 'Disattivata'}
    </span>
  )
}

export function CampaignOpenBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span className={`campaign-open-badge ${isOpen ? 'is-open' : 'is-closed'}`} title={isOpen ? 'Campagna aperta' : 'Campagna chiusa'}>
      <span className="campaign-open-badge-icon" aria-hidden="true">
        <Icon name={isOpen ? 'fa-solid fa-unlock' : 'fa-solid fa-lock'} />
      </span>
      <span>{isOpen ? 'APERTA' : 'CHIUSA'}</span>
    </span>
  )
}
