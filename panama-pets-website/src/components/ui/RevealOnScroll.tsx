import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUp } from '../../lib/motionVariants'
import { useMotionVariants } from '../../hooks/useReducedMotion'

type RevealOnScrollProps = {
  children: ReactNode
  className?: string
  delay?: number
}

export function RevealOnScroll({ children, className, delay = 0 }: RevealOnScrollProps) {
  const baseVariants = useMotionVariants(fadeUp)
  const variants = delay
    ? {
        ...baseVariants,
        visible: {
          ...baseVariants.visible,
          transition: {
            ...(baseVariants.visible as { transition?: object }).transition,
            delay,
          },
        },
      }
    : baseVariants

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {children}
    </motion.div>
  )
}
