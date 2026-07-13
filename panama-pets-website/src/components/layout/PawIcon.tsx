export function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5.5" cy="9" r="2.2" />
      <circle cx="10.2" cy="5.8" r="2.2" />
      <circle cx="14.8" cy="5.8" r="2.2" />
      <circle cx="19.5" cy="9" r="2.2" />
      <path d="M12.5 11c3.6 0 6.5 2.4 6.5 5.4 0 1.9-1.6 3.1-3.5 3.1-1.1 0-1.9-.5-3-0.5s-1.9.5-3 .5c-1.9 0-3.5-1.2-3.5-3.1 0-3 2.9-5.4 6.5-5.4z" />
    </svg>
  )
}
