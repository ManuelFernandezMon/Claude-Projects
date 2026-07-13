export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="font-heading text-sm font-semibold uppercase tracking-wide text-clinic-green">
          {eyebrow}
        </p>
      )}
      <h2 className="font-heading mt-1 text-3xl font-bold text-clinic-ink sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-3 text-clinic-ink-soft">{description}</p>}
    </div>
  )
}
