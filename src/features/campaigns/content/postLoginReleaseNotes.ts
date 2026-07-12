import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

// Naming richiesto: postLoginReleaseNotes.YYYYMMDDHHMMSS.ts
// Il loader seleziona automaticamente il file con timestamp piu recente.
const releaseNoteModules = import.meta.glob('./postLoginReleaseNotes.[0-9]*.ts', {
  eager: true,
  import: 'POST_LOGIN_RELEASE_NOTES',
}) as Record<string, PostLoginReleaseNotes>

function extractTimestamp(path: string) {
  const match = path.match(/postLoginReleaseNotes\.(\d{14})\.ts$/)
  return match?.[1] || ''
}

const latestReleaseNotesEntry = Object.entries(releaseNoteModules)
  .filter(([path]) => extractTimestamp(path))
  .sort(([leftPath], [rightPath]) => extractTimestamp(rightPath).localeCompare(extractTimestamp(leftPath)))[0]

if (!latestReleaseNotesEntry) {
  throw new Error('Nessun file postLoginReleaseNotes.<YYYYMMDDHHMMSS>.ts trovato')
}

export const POST_LOGIN_RELEASE_NOTES = latestReleaseNotesEntry[1]
