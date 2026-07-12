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

function normalizeMimeExtension(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/jpg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'img'
  }
}

function getRealmInitials(realmName: string): string {
  const parts = realmName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'G'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

async function fetchRealmLogoFile(logoUrl: string): Promise<File | null> {
  try {
    const response = await fetch(new URL(logoUrl, window.location.href).toString(), {
      mode: 'cors',
      credentials: 'omit',
    })

    if (!response.ok) return null

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim()
    const blob = await response.blob()
    const mimeType = blob.type || contentType
    if (!mimeType.startsWith('image/')) return null

    const extension = normalizeMimeExtension(mimeType)
    return new File([blob], `realm-logo.${extension}`, { type: mimeType })
  } catch {
    return null
  }
}

async function createFallbackRealmArtworkFile(realmName: string): Promise<File | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const width = canvas.width
  const height = canvas.height
  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#0b1220')
  bg.addColorStop(1, '#16253b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(48, 48, width - 96, height - 96)

  ctx.fillStyle = '#d9e6ff'
  ctx.font = '700 76px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(realmName.trim() || 'GATE', width / 2, height / 2 - 42)

  ctx.fillStyle = '#7dffad'
  ctx.font = '800 160px Inter, system-ui, sans-serif'
  ctx.fillText(getRealmInitials(realmName), width / 2, height / 2 + 72)

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null)
          return
        }
        resolve(new File([blob], 'realm-share.png', { type: 'image/png' }))
      },
      'image/png',
      0.95,
    )
  })
}

async function buildRealmShareArtworkFile(
  realmName: string,
  realmLogoUrl?: string | null,
): Promise<File | null> {
  const logoUrl = realmLogoUrl?.trim() || ''
  if (logoUrl) {
    const logoFile = await fetchRealmLogoFile(logoUrl)
    if (logoFile) return logoFile
  }

  return createFallbackRealmArtworkFile(realmName)
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

export async function shareMissionOnWhatsApp(
  mission: MissionResponse,
  options?: { realmLogoUrl?: string | null; realmName?: string },
): Promise<void> {
  const text = buildMissionShareText(mission)

  if (typeof navigator.share === 'function') {
    const realmArtworkFile = await buildRealmShareArtworkFile(options?.realmName || 'GATE', options?.realmLogoUrl)
    if (realmArtworkFile) {
      const shareData = {
        title: mission.title,
        text,
        files: [realmArtworkFile],
      }

      if (typeof navigator.canShare !== 'function' || navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData)
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }
        }
      }
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: mission.title,
        text,
      })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
    }
  }

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
  const opened = window.open(shareUrl, '_blank', 'noopener,noreferrer')

  if (!opened) {
    window.location.href = shareUrl
  }
}
