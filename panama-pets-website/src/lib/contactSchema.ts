import { z } from 'zod'

export const contactSchema = z
  .object({
    ownerName: z.string().min(2, 'Please enter your name'),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    petName: z.string().min(1, "Please enter your pet's name"),
    petType: z.string().min(1, 'Please enter your pet type (e.g. dog, cat)'),
    preferredDate: z.string().optional().or(z.literal('')),
    message: z.string().min(5, 'Tell us a bit about the reason for your visit'),
  })
  .refine((data) => (data.phone && data.phone.length > 0) || (data.email && data.email.length > 0), {
    message: 'Please provide a phone number or email so we can reach you',
    path: ['phone'],
  })

export type ContactFormValues = z.infer<typeof contactSchema>
