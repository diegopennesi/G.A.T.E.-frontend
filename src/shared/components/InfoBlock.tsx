export function InfoBlock({ title, value }: { title: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="info-block">
      <p className="field-label">{title}</p>
      <p>{value}</p>
    </div>
  )
}
