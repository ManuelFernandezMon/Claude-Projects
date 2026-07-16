import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCart } from '../../hooks/useCart'
import { createOrder } from '../../lib/api'
import { ApiError, ERROR_MESSAGES } from '../../lib/errors'
import { checkoutSchema, type CheckoutFormValues } from '../../lib/checkoutSchema'
import { Button } from '../ui/Button'
import { ErrorBanner } from '../ui/ErrorBanner'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink transition-colors focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/20'

export function CheckoutForm() {
  const { lines, setLastOrder, clearCart } = useCart()
  const navigate = useNavigate()
  const [banner, setBanner] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CheckoutFormValues>({ resolver: zodResolver(checkoutSchema) })

  const onSubmit = async (data: CheckoutFormValues) => {
    if (lines.length === 0) {
      setBanner('Your cart is empty — add something from the menu first.')
      return
    }

    setBanner(null)
    setSubmitting(true)
    try {
      const { order } = await createOrder({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        items: lines.map((line) => ({ menu_item_id: line.menuItemId, quantity: line.quantity })),
      })
      setLastOrder(order)
      clearCart()
      navigate('/order/confirmation')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && err.fields) {
          for (const [field, messages] of Object.entries(err.fields)) {
            if (field in checkoutSchema.shape && messages?.[0]) {
              setError(field as keyof CheckoutFormValues, { message: messages[0] })
            }
          }
        }
        setBanner(ERROR_MESSAGES[err.code])
      } else {
        setBanner(ERROR_MESSAGES.NETWORK_ERROR)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="customer_name" className="mb-1 block text-sm font-medium text-ink">
          Your name
        </label>
        <input id="customer_name" className={inputClass} {...register('customer_name')} />
        {errors.customer_name && (
          <p className="mt-1 text-xs text-status-cancelled">{errors.customer_name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="customer_email" className="mb-1 block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="customer_email"
          type="email"
          className={inputClass}
          {...register('customer_email')}
        />
        {errors.customer_email && (
          <p className="mt-1 text-xs text-status-cancelled">{errors.customer_email.message}</p>
        )}
      </div>

      {banner && <ErrorBanner message={banner} />}

      <Button type="submit" disabled={submitting} className="w-full justify-center">
        {submitting ? 'Placing order…' : 'Place order'}
      </Button>
    </form>
  )
}
