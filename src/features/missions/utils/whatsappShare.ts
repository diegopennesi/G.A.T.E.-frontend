import type { MissionResponse } from '../../../types/domain'

function stripWhatsappFormatting(value: string): string {
  return value.replace(/[*_~`]/g, '').trim()
}

function normalizeShareDescription(value: string | null | undefined): string {
  if (!value) return ''
  return stripWhatsappFormatting(value)
}

function normalizeShareTitle(value: string): string {
  return stripWhatsappFormatting(value).replace(/\s+/g, ' ')
}

function buildMissionShareUrl(mission: MissionResponse): string {
  const baseUrl =
    (import.meta.env.VITE_PUBLIC_APP_BASE_URL as string | undefined)?.trim() ||
    `${window.location.origin}${window.location.pathname}`
  const url = new URL(baseUrl)
  url.searchParams.set('campaignId', mission.campaignId)
  url.searchParams.set('missionId', mission.id)
  return url.toString()
}

export function buildMissionShareText(mission: MissionResponse): string {
  const title = normalizeShareTitle(mission.title)
  const description = normalizeShareDescription(mission.description)
  const url = buildMissionShareUrl(mission)

  const lines = [
    'MISSIONE',
    '',
    `*Titolo:* ${title}`,
  ]

  if (description) {
    lines.push('', `_${description}_`)
  }

  lines.push('', url)

  return lines.join('\n')
}

export function shareMissionOnWhatsApp(mission: MissionResponse): void {
  const text = buildMissionShareText(mission)
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
  const opened = window.open(shareUrl, '_blank', 'noopener,noreferrer')

  if (!opened) {
    window.location.href = shareUrl
  }
}
