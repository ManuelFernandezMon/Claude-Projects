import { motion } from 'framer-motion'
import type { Service } from '../../data/services'

const ACCENTS = [
  'bg-paw-red/10 text-paw-red',
  'bg-paw-orange/10 text-paw-orange',
  'bg-paw-teal/10 text-paw-teal',
  'bg-paw-blue/10 text-paw-blue',
  'bg-paw-purple/10 text-paw-purple',
]

export function ServiceCard({ service, index }: { service: Service; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length]

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-clinic-green/10"
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${accent}`}
      >
        {index + 1}
      </span>
      <h3 className="font-heading mt-4 text-lg font-semibold text-clinic-ink">
        {service.title}
      </h3>
      <p className="mt-2 text-sm text-clinic-ink-soft">{service.description}</p>
    </motion.div>
  )
}
