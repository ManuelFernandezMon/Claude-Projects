import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { SectionHeading } from '../components/ui/SectionHeading'
import { ServiceCard } from '../components/ui/ServiceCard'
import { services } from '../data/services'
import { staggerContainer, fadeUp } from '../lib/motionVariants'
import { useMotionVariants } from '../hooks/useReducedMotion'

export function ServicesPage() {
  const container = useMotionVariants(staggerContainer)
  const item = useMotionVariants(fadeUp)

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <SectionHeading
        eyebrow="Services"
        title="How we can help your pet"
        description="A general overview of what Panama Pets offers, based on the clinic's equipment and setup."
      />

      <div className="mt-4 rounded-xl bg-paw-yellow/10 px-4 py-3 text-sm text-clinic-ink-soft ring-1 ring-paw-yellow/30">
        These services are inferred from photos of the clinic — please call{' '}
        <a href="tel:+5072791225" className="font-semibold text-clinic-green-dark">
          279-1225
        </a>{' '}
        to confirm exact offerings and pricing before your visit.
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {services.map((service, i) => (
          <motion.div key={service.id} variants={item}>
            <ServiceCard service={service} index={i} />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-10 text-center">
        <Link
          to="/contact"
          className="inline-block rounded-full bg-clinic-green px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
        >
          Book a Visit
        </Link>
      </div>
    </section>
  )
}
