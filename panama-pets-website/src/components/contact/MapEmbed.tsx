import { clinicInfo } from '../../data/clinicInfo'

export function MapEmbed() {
  const encodedAddress = encodeURIComponent(clinicInfo.address)

  return (
    <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-clinic-green/10">
      <iframe
        title={`${clinicInfo.name} location`}
        src={`https://www.google.com/maps?q=${encodedAddress}&output=embed`}
        width="100%"
        height="360"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="bg-white px-4 py-3 text-sm">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-clinic-green-dark hover:underline"
        >
          Get Directions →
        </a>
      </div>
    </div>
  )
}
