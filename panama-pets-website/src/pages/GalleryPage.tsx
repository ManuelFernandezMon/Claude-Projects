import { SectionHeading } from '../components/ui/SectionHeading'
import { PhotoGallery, type GalleryPhoto } from '../components/gallery/PhotoGallery'
import storefrontDayImg from '../assets/images/storefront-day.jpg'
import storefrontNightImg from '../assets/images/storefront-night.jpg'
import examRoomImg from '../assets/images/exam-room.jpg'
import pharmacyShelves1Img from '../assets/images/pharmacy-shelves-1.jpg'
import pharmacyShelves2Img from '../assets/images/pharmacy-shelves-2.jpg'
import medicalEquipmentImg from '../assets/images/medical-equipment.jpg'
import petCarriersImg from '../assets/images/pet-carriers.jpg'

const photos: GalleryPhoto[] = [
  { id: 'storefront-day', src: storefrontDayImg, alt: 'Panama Pets storefront during the day' },
  { id: 'storefront-night', src: storefrontNightImg, alt: 'Panama Pets storefront at night' },
  { id: 'exam-room', src: examRoomImg, alt: 'Exam and treatment room' },
  { id: 'pharmacy-1', src: pharmacyShelves1Img, alt: 'Pharmacy shelves with pet medications' },
  { id: 'pharmacy-2', src: pharmacyShelves2Img, alt: 'Pet food and supply shelves' },
  { id: 'equipment', src: medicalEquipmentImg, alt: 'Sterilization and oxygen equipment' },
  { id: 'carriers', src: petCarriersImg, alt: 'Boarding kennels and pet carriers' },
]

export function GalleryPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <SectionHeading
        eyebrow="Gallery"
        title="A look inside Panama Pets"
        description="Real photos of our clinic — tap any photo to see it larger."
      />
      <div className="mt-8">
        <PhotoGallery photos={photos} />
      </div>
    </section>
  )
}
