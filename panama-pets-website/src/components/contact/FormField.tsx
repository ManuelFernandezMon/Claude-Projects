import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-clinic-ink">
        {label}
      </label>
      <motion.div
        animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-1"
      >
        {children}
      </motion.div>
      {error && <p className="mt-1 text-xs text-paw-red">{error}</p>}
    </div>
  )
}
