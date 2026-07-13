import { AnimatePresence, motion } from 'framer-motion'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

export function FormStatusBanner({ status }: { status: FormStatus }) {
  return (
    <AnimatePresence mode="wait">
      {status === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl bg-clinic-green-light px-4 py-3 text-sm font-medium text-clinic-green-dark"
          role="status"
        >
          Thanks! Your request has been sent — we'll be in touch soon.
        </motion.div>
      )}
      {status === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl bg-paw-red/10 px-4 py-3 text-sm font-medium text-paw-red"
          role="alert"
        >
          Something went wrong sending your request. Please try again, or call{' '}
          <a href="tel:+5072791225" className="underline">
            279-1225
          </a>
          .
        </motion.div>
      )}
    </AnimatePresence>
  )
}
