import { z } from 'zod'

export const checkoutSchema = z.object({
  customer_name: z.string().min(2, 'Please enter your name').max(100).trim(),
  customer_email: z.string().email('Enter a valid email'),
})

export type CheckoutFormValues = z.infer<typeof checkoutSchema>
