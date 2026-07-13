export type Testimonial = {
  author: string
  rating: number
  quote: string
  truncated?: boolean
  sourceNote?: string
}

export const testimonials: Testimonial[] = [
  {
    author: 'Hannelore Proano',
    rating: 5,
    quote:
      'Excellent Doctor, very professional and kind with my little dog, totally recommended!!!!',
  },
  {
    author: 'Katherine L. Quiro',
    rating: 5,
    // The source screenshot cuts this review off mid-sentence. Trimmed to
    // the last complete clause rather than guessing the missing words.
    quote: "Dr. Hugo Turillazzi truly demonstrates his commitment to his patients.",
    truncated: true,
    sourceNote: 'Excerpt — read the full review on Google.',
  },
]
