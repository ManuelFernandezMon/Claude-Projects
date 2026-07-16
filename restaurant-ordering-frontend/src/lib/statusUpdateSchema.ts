import { z } from 'zod'

export const ORDER_STATUSES = ['pending', 'preparing', 'completed', 'cancelled'] as const

export const statusUpdateSchema = z.object({
  orderId: z.string().uuid('Enter a valid order ID (UUID)'),
  status: z.enum(ORDER_STATUSES),
})

export type StatusUpdateFormValues = z.infer<typeof statusUpdateSchema>
