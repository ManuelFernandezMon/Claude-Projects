import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { RatingBadge } from '../components/ui/RatingBadge'
import { RevealOnScroll } from '../components/ui/RevealOnScroll'
import { ServiceCard } from '../components/ui/ServiceCard'
import { TestimonialCard } from '../components/ui/TestimonialCard'
import { clinicInfo } from '../data/clinicInfo'
import { services } from '../data/services'
import { testimonials } from '../data/testimonials'
import { staggerContainer, fadeUp } from '../lib/motionVariants'
import { useMotionVariants } from '../hooks/useReducedMotion'
import examRoomImg from '../assets/images/exam-room.jpg'
import storefrontImg from '../assets/images/storefront-day.jpg'

export function HomePage() {
  const container = useMotionVariants(staggerContainer)
  const item = useMotionVariants(fadeUp)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-clinic-green-light">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <motion.div variants={container} initial="hidden" animate="visible">
            <motion.p
              variants={item}
              className="font-heading text-sm font-semibold uppercase tracking-wide text-clinic-green"
            >
              {clinicInfo.category} · Panama City
            </motion.p>
            <motion.h1
              variants={item}
              className="font-heading mt-2 text-4xl font-bold text-clinic-ink sm:text-5xl"
            >
              Caring for your pets like family.
            </motion.h1>
            <motion.p variants={item} className="mt-4 max-w-md text-clinic-ink-soft">
              {clinicInfo.name} is a neighborhood veterinary clinic led by{' '}
              {clinicInfo.vet}, offering exams, minor surgery, pharmacy, and boarding
              in Panama City.
            </motion.p>
            <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/contact"
                className="rounded-full bg-clinic-green px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
              >
                Book a Visit
              </Link>
              <a
                href={clinicInfo.phoneHref}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-clinic-green-dark shadow-sm ring-1 ring-clinic-green/20 transition-transform hover:scale-105 active:scale-95"
              >
                Call {clinicInfo.phone}
              </a>
            </motion.div>
            <motion.div variants={item} className="mt-6">
              <RatingBadge />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
            className="overflow-hidden rounded-3xl shadow-lg"
          >
            <img
              src={storefrontImg}
              alt="Panama Pets storefront on Av. 17D Nte., Panama City"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <RevealOnScroll>
          <p className="font-heading text-sm font-semibold uppercase tracking-wide text-clinic-green">
            What we offer
          </p>
          <h2 className="font-heading mt-1 text-3xl font-bold text-clinic-ink sm:text-4xl">
            Everything your pet needs, in one clinic
          </h2>
        </RevealOnScroll>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {services.slice(0, 3).map((service, i) => (
            <motion.div key={service.id} variants={item}>
              <ServiceCard service={service} index={i} />
            </motion.div>
          ))}
        </motion.div>

        <RevealOnScroll className="mt-6">
          <Link
            to="/services"
            className="text-sm font-semibold text-clinic-green-dark hover:underline"
          >
            See all services →
          </Link>
        </RevealOnScroll>
      </section>

      {/* Exam room + testimonial teaser */}
      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2 md:items-center">
          <RevealOnScroll className="overflow-hidden rounded-3xl">
            <img
              src={examRoomImg}
              alt="Panama Pets exam and treatment room"
              className="h-full w-full object-cover"
            />
          </RevealOnScroll>
          <RevealOnScroll delay={0.1}>
            {testimonials[0] && <TestimonialCard testimonial={testimonials[0]} />}
            <Link
              to="/testimonials"
              className="mt-4 inline-block text-sm font-semibold text-clinic-green-dark hover:underline"
            >
              Read more reviews →
            </Link>
          </RevealOnScroll>
        </div>
      </section>

      {/* Map teaser */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <RevealOnScroll className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-clinic-green-dark px-8 py-10 text-clinic-cream sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-2xl font-bold">Come say hi</h2>
            <p className="mt-1 text-clinic-cream/80">{clinicInfo.address}</p>
          </div>
          <Link
            to="/contact"
            className="whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm font-semibold text-clinic-green-dark transition-transform hover:scale-105 active:scale-95"
          >
            Get Directions
          </Link>
        </RevealOnScroll>
      </section>
    </>
  )
}
