import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateOrderStatus } from '../../lib/api'
import { ApiError, ERROR_MESSAGES } from '../../lib/errors'
import {
  ORDER_STATUSES,
  statusUpdateSchema,
  type StatusUpdateFormValues,
} from '../../lib/statusUpdateSchema'
import { Button } from '../ui/Button'
import { ErrorBanner } from '../ui/ErrorBanner'
import { StatusBadge } from '../ui/StatusBadge'
import { formatCurrency } from '../../lib/currency'
import type { StatusUpdateResult } from '../../types/api'

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink transition-colors focus:border-ink-soft focus:outline-none focus:ring-2 focus:ring-ink-soft/20'

export function StatusUpdateForm() {
  const [result, setResult] = useState<StatusUpdateResult | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StatusUpdateFormValues>({ resolver: zodResolver(statusUpdateSchema) })

  const onSubmit = async (data: StatusUpdateFormValues) => {
    setBanner(null)
    setSubmitting(true)
    try {
      const { order } = await updateOrderStatus(data.orderId, data.status)
      setResult(order)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_ID_FORMAT' || err.code === 'ORDER_NOT_FOUND') {
          setError('orderId', { message: ERROR_MESSAGES[err.code] })
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
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="orderId" className="mb-1 block text-sm font-medium text-ink">
            Order ID
          </label>
          <input
            id="orderId"
            className={`${inputClass} font-mono`}
            placeholder="e.g. 6a1c9e0e-2f3a-4b8e-9c1a-2d7e5f6a1b2c"
            {...register('orderId')}
          />
          {errors.orderId && (
            <p className="mt-1 text-xs text-status-cancelled">{errors.orderId.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-ink">
            New status
          </label>
          <select id="status" className={inputClass} {...register('status')}>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {banner && <ErrorBanner message={banner} />}

        <Button type="submit" variant="secondary" disabled={submitting} className="w-full justify-center">
          {submitting ? 'Updating…' : 'Update status'}
        </Button>
      </form>

      {result && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-ink-soft">{result.id}</p>
            <StatusBadge status={result.status} />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink-soft">Total</span>
            <span className="font-semibold text-ink tabular-nums">
              {formatCurrency(result.total_amount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Updated {new Date(result.updated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
