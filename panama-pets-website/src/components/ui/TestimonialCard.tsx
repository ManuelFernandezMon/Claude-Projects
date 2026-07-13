import { motion } from 'framer-motion'
import type { Testimonial } from '../../data/testimonials'
import { clinicInfo } from '../../data/clinicInfo'

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-clinic-green/10"
    >
      <div className="text-paw-yellow" aria-label={`${testimonial.rating} out of 5 stars`}>
        {'★'.repeat(testimonial.rating)}
      </div>
      <p className="mt-3 text-clinic-ink">
        "{testimonial.quote}"
        {testimonial.truncated && (
          <span className="ml-1 text-clinic-ink-soft">&hellip;</span>
        )}
      </p>
      <p className="mt-4 text-sm font-semibold text-clinic-green-dark">
        {testimonial.author}
      </p>
      {testimonial.truncated && (
        <a
          href={clinicInfo.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-clinic-ink-soft underline decoration-dotted hover:text-clinic-green-dark"
        >
          {testimonial.sourceNote}
        </a>
      )}
    </motion.div>
  )
}
