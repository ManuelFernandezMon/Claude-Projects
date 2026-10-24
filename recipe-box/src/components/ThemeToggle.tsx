import { Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from '../hooks/useTheme'

/** Switches between the dark and light look. The choice is remembered on this device. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === 'light' ? 'dark' : 'light'
  return (
    <button type="button" className="btn btn--icon" onClick={toggle} aria-label={`Switch to ${next} theme`}>
      {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </button>
  )
}
