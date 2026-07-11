export type PostLoginReleaseNotes = {
  version: string
  eyebrow: string
  title: string
  summary: string
  sections: Array<{
    title: string
    items: Array<{
      label: string
      details?: string[]
    }>
  }>
}
