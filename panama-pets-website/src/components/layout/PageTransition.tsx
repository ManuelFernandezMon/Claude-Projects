import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pageVariants } from '../../lib/motionVariants'
import { useMotionVariants } from '../../hooks/useReducedMotion'

export function PageTransition({ children }: { children: ReactNode }) {
  const variants = useMotionVariants(pageVariants)

  return (
    <motion.main
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-[60vh]"
    >
      {children}
    </motion.main>
  )
}
