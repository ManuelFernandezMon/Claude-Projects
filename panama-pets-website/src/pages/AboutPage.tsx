import { SectionHeading } from '../components/ui/SectionHeading'
import { RevealOnScroll } from '../components/ui/RevealOnScroll'
import { clinicInfo } from '../data/clinicInfo'
import storefrontDayImg from '../assets/images/storefront-day.jpg'
import storefrontNightImg from '../assets/images/storefront-night.jpg'

export function AboutPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <SectionHeading
        eyebrow="About us"
        title={`Meet ${clinicInfo.vet}`}
        description={`${clinicInfo.name} is a hands-on, family-run veterinary clinic on Av. 17D Nte. in Panama City — easy to spot by its hand-painted green storefront.`}
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <RevealOnScroll className="overflow-hidden rounded-3xl">
          <img
            src={storefrontDayImg}
            alt="Panama Pets storefront during the day, with its hand-painted sign"
            className="h-full w-full object-cover"
          />
        </RevealOnScroll>
        <RevealOnScroll delay={0.1} className="overflow-hidden rounded-3xl">
          <img
            src={storefrontNightImg}
            alt="Panama Pets storefront lit up at night"
            className="h-full w-full object-cover"
          />
        </RevealOnScroll>
      </div>

      <RevealOnScroll className="mt-10 max-w-3xl space-y-4 text-clinic-ink-soft">
        <p>
          Walk through the door and you'll find a working clinic, not a waiting-room
          facade — an exam table ready for check-ups, a pharmacy stocked for everyday
          pet care, and sterilization and oxygen equipment on hand for minor
          procedures.
        </p>
        <p>
          {clinicInfo.vet} has built {clinicInfo.name}'s{' '}
          {clinicInfo.rating}★ reputation ({clinicInfo.reviewCount} Google reviews)
          on being attentive and kind with every pet that comes through — reviewers
          consistently mention the personal, professional care.
        </p>
      </RevealOnScroll>
    </section>
  )
}
