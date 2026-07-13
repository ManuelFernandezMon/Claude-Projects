export const clinicInfo = {
  name: 'Panama Pets',
  category: 'Veterinarian',
  vet: 'Dr. Hugo Turillazzi',
  address: '2F8F+J72, Av. 17D Nte., Panamá, Provincia de Panamá',
  phone: '279-1225',
  // TODO(client): confirm country/area code before publishing a click-to-call link.
  phoneHref: 'tel:+5072791225',
  rating: 4.3,
  reviewCount: 36,
  googleMapsUrl: 'https://maps.app.goo.gl/XKvGz1NMwMeHDXPB7',
  // TODO(client): hours were not available on the Google listing at build time.
  // Render a "call to confirm" placeholder — never invent hours here.
  hours: null as string[] | null,
} as const
