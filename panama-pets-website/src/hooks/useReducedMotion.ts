import { useReducedMotion as useFramerReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'

/**
 * Collapses any Variants down to an instant opacity-only transition when
 * the user has requested reduced motion, so every animated component in
 * the app can opt in without re-implementing this check.
 */
export function useMotionVariants(variants: Variants): Variants {
  const prefersReducedMotion = useFramerReducedMotion()

  if (!prefersReducedMotion) return variants

  const reduced: Variants = {}
  for (const key of Object.keys(variants)) {
    reduced[key] = { opacity: key === 'exit' ? 0 : 1, transition: { duration: 0.01 } }
  }
  return reduced
}
