import { motion } from 'framer-motion'
import { SectionHeading } from '../components/ui/SectionHeading'
import { RatingBadge } from '../components/ui/RatingBadge'
import { TestimonialCard } from '../components/ui/TestimonialCard'
import { testimonials } from '../data/testimonials'
import { clinicInfo } from '../data/clinicInfo'
import { staggerContainer, fadeUp } from '../lib/motionVariants'
import { useMotionVariants } from '../hooks/useReducedMotion'

export function TestimonialsPage() {
  const container = useMotionVariants(staggerContainer)
  const item = useMotionVariants(fadeUp)

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Testimonials"
          title="What pet owners say"
          description="A couple of real reviews from the Panama Pets Google listing."
        />
        <RatingBadge />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="mt-10 grid gap-6 sm:grid-cols-2"
      >
        {testimonials.map((testimonial) => (
          <motion.div key={testimonial.author} variants={item}>
            <TestimonialCard testimonial={testimonial} />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-10 text-center">
        <a
          href={clinicInfo.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-clinic-green-dark hover:underline"
        >
          See all {clinicInfo.reviewCount} reviews on Google →
        </a>
      </div>
    </section>
  )
}
