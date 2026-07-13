import { PawIcon } from './PawIcon'
import { clinicInfo } from '../../data/clinicInfo'

export function Footer() {
  return (
    <footer className="border-t border-clinic-green/10 bg-clinic-green-dark text-clinic-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <PawIcon className="h-7 w-7" />
            <span className="font-heading text-lg font-bold">{clinicInfo.name}</span>
          </div>
          <p className="mt-2 text-sm text-clinic-cream/80">
            {clinicInfo.category} in Panama City, led by {clinicInfo.vet}.
          </p>
        </div>

        <div className="text-sm text-clinic-cream/80">
          <p className="font-heading mb-2 text-clinic-cream">Visit</p>
          <p>{clinicInfo.address}</p>
          <a href={clinicInfo.phoneHref} className="mt-1 inline-block hover:underline">
            {clinicInfo.phone}
          </a>
        </div>

        <div className="text-sm text-clinic-cream/80">
          <p className="font-heading mb-2 text-clinic-cream">Rated by pet owners</p>
          <p>
            {clinicInfo.rating}★ · {clinicInfo.reviewCount} Google reviews
          </p>
          <a
            href={clinicInfo.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block hover:underline"
          >
            View on Google Maps
          </a>
        </div>
      </div>

      <div className="border-t border-clinic-cream/10 px-5 py-4 text-center text-xs text-clinic-cream/60">
        &copy; {new Date().getFullYear()} {clinicInfo.name}. All rights reserved.
      </div>
    </footer>
  )
}
