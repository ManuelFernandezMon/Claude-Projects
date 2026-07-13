import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { PawIcon } from './PawIcon'
import { clinicInfo } from '../../data/clinicInfo'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/testimonials', label: 'Testimonials' },
  { to: '/contact', label: 'Contact' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 border-b border-clinic-green/10 bg-clinic-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <NavLink to="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
          <PawIcon className="h-8 w-8 text-clinic-green" />
          <span className="font-heading text-xl font-bold text-clinic-green-dark">
            {clinicInfo.name}
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to)
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className="relative px-3 py-2 text-sm font-medium text-clinic-ink-soft transition-colors hover:text-clinic-green-dark"
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-indicator"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-clinic-green"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </NavLink>
            )
          })}
          <a
            href={clinicInfo.phoneHref}
            className="ml-3 rounded-full bg-clinic-green px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
          >
            Call {clinicInfo.phone}
          </a>
        </nav>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-clinic-green-dark md:hidden"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <motion.span animate={{ rotate: isMenuOpen ? 90 : 0 }} className="text-2xl leading-none">
            {isMenuOpen ? '✕' : '☰'}
          </motion.span>
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden border-t border-clinic-green/10 md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-3">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'bg-clinic-green-light text-clinic-green-dark'
                        : 'text-clinic-ink-soft'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <a
                href={clinicInfo.phoneHref}
                className="mt-2 rounded-full bg-clinic-green px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Call {clinicInfo.phone}
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
