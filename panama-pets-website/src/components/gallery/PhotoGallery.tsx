import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RevealOnScroll } from '../ui/RevealOnScroll'

export type GalleryPhoto = {
  id: string
  src: string
  alt: string
}

export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const openPhoto = photos.find((p) => p.id === openId) ?? null

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <RevealOnScroll key={photo.id} delay={(i % 3) * 0.05}>
            <motion.button
              type="button"
              layoutId={`gallery-photo-${photo.id}`}
              onClick={() => setOpenId(photo.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="block w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-clinic-green/10"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </motion.button>
          </RevealOnScroll>
        ))}
      </div>

      <AnimatePresence>
        {openPhoto && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-clinic-ink/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenId(null)}
          >
            <motion.div
              layoutId={`gallery-photo-${openPhoto.id}`}
              className="max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={openPhoto.src}
                alt={openPhoto.alt}
                className="max-h-[85vh] w-full object-contain"
              />
            </motion.div>
            <button
              type="button"
              aria-label="Close photo"
              onClick={() => setOpenId(null)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg text-clinic-ink"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
