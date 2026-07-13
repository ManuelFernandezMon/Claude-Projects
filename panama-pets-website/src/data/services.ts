// TODO(client): this list is inferred from equipment visible in clinic
// photos (exam table, autoclave, oxygen concentrator, pharmacy shelves,
// boarding kennels, delivery van) — confirm the exact service list and
// pricing with Panama Pets before publishing.
export type Service = {
  id: string
  title: string
  description: string
}

export const services: Service[] = [
  {
    id: 'consultations',
    title: 'General Consultations & Exams',
    description:
      'Routine check-ups, health assessments, and vaccinations in a dedicated exam room.',
  },
  {
    id: 'diagnostics-surgery',
    title: 'Diagnostics & Minor Surgery',
    description:
      'On-site sterilization (autoclave), oxygen therapy, and IV support for procedures and recovery.',
  },
  {
    id: 'pharmacy',
    title: 'Pet Pharmacy & Supplies',
    description:
      'A stocked pharmacy with medications, supplements, and everyday pet-care products.',
  },
  {
    id: 'boarding',
    title: 'Boarding',
    description: 'Kennel space for pets staying overnight or while owners travel.',
  },
  {
    id: 'delivery',
    title: 'Food & Supply Delivery',
    description: 'Home delivery of pet food and supplies around Panama City.',
  },
]
