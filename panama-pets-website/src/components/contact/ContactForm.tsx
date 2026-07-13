import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { contactSchema, type ContactFormValues } from '../../lib/contactSchema'
import { FormField } from './FormField'
import { FormStatusBanner } from './FormStatusBanner'

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined

const inputClass =
  'w-full rounded-lg border border-clinic-green/20 bg-white px-3 py-2 text-sm text-clinic-ink transition-colors focus:border-clinic-green focus:outline-none focus:ring-2 focus:ring-clinic-green/20'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) })

  const onSubmit = async (data: ContactFormValues) => {
    if (!FORMSPREE_ENDPOINT) {
      console.warn(
        'VITE_FORMSPREE_ENDPOINT is not set — see .env.example. Form will not actually send.',
      )
      setStatus('error')
      return
    }

    setStatus('submitting')
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Form submission failed')
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Your name" htmlFor="ownerName" error={errors.ownerName?.message}>
          <input id="ownerName" className={inputClass} {...register('ownerName')} />
        </FormField>
        <FormField label="Pet's name" htmlFor="petName" error={errors.petName?.message}>
          <input id="petName" className={inputClass} {...register('petName')} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" type="tel" className={inputClass} {...register('phone')} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" className={inputClass} {...register('email')} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Pet type" htmlFor="petType" error={errors.petType?.message}>
          <input
            id="petType"
            placeholder="Dog, cat, etc."
            className={inputClass}
            {...register('petType')}
          />
        </FormField>
        <FormField
          label="Preferred date (optional)"
          htmlFor="preferredDate"
          error={errors.preferredDate?.message}
        >
          <input
            id="preferredDate"
            type="date"
            className={inputClass}
            {...register('preferredDate')}
          />
        </FormField>
      </div>

      <FormField label="Reason for visit" htmlFor="message" error={errors.message?.message}>
        <textarea id="message" rows={4} className={inputClass} {...register('message')} />
      </FormField>

      <FormStatusBanner status={status} />

      <motion.button
        type="submit"
        disabled={status === 'submitting'}
        whileHover={{ scale: status === 'submitting' ? 1 : 1.03 }}
        whileTap={{ scale: status === 'submitting' ? 1 : 0.97 }}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-clinic-green px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-70 sm:w-auto"
      >
        {status === 'submitting' && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {status === 'submitting' ? 'Sending…' : 'Request an Appointment'}
      </motion.button>
    </form>
  )
}
