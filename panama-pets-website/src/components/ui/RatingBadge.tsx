import { clinicInfo } from '../../data/clinicInfo'

export function RatingBadge({ className }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-clinic-ink shadow-sm ring-1 ring-clinic-green/10 ${className ?? ''}`}
    >
      <span className="text-paw-yellow">★</span>
      {clinicInfo.rating} · {clinicInfo.reviewCount} Google reviews
    </div>
  )
}
