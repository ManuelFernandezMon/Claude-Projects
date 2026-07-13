import { SectionHeading } from '../components/ui/SectionHeading'
import { RevealOnScroll } from '../components/ui/RevealOnScroll'
import { ContactForm } from '../components/contact/ContactForm'
import { MapEmbed } from '../components/contact/MapEmbed'
import { clinicInfo } from '../data/clinicInfo'

export function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <SectionHeading
        eyebrow="Contact"
        title="Book a visit or ask a question"
        description="Send us a message and we'll get back to you, or call us directly."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <RevealOnScroll className="lg:col-span-3">
          <ContactForm />
        </RevealOnScroll>

        <RevealOnScroll delay={0.1} className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-clinic-green/10">
            <h3 className="font-heading text-lg font-semibold text-clinic-ink">
              Clinic details
            </h3>
            <dl className="mt-3 space-y-2 text-sm text-clinic-ink-soft">
              <div>
                <dt className="font-medium text-clinic-ink">Address</dt>
                <dd>{clinicInfo.address}</dd>
              </div>
              <div>
                <dt className="font-medium text-clinic-ink">Phone</dt>
                <dd>
                  <a href={clinicInfo.phoneHref} className="hover:underline">
                    {clinicInfo.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-clinic-ink">Hours</dt>
                <dd>
                  Coming soon — please call to confirm current hours.
                </dd>
              </div>
            </dl>
          </div>

          <MapEmbed />
        </RevealOnScroll>
      </div>
    </section>
  )
}
