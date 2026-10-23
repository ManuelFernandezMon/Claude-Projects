import { forwardRef, useCallback } from 'react'
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useNavigate as useRouterNavigate,
  useViewTransitionState,
  type LinkProps,
  type NavLinkProps,
  type NavigateOptions,
  type To,
} from 'react-router-dom'

/**
 * Every in-app navigation goes through these wrappers so pages cross-fade (and a recipe photo can grow into its
 * page) instead of cutting. The browser's View Transitions API does the animating; where it is missing, or the
 * user asked for less motion, navigation is simply instant.
 */
function canAnimate(): boolean {
  try {
    return (
      typeof document.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  } catch {
    return false
  }
}

function markNavigated() {
  // Turns off the one-time entrance animation (base.css) so it never stacks on top of a view transition.
  document.documentElement.dataset.vt = '1'
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
  return <RouterLink ref={ref} viewTransition={canAnimate()} {...props} onClick={(e) => { markNavigated(); props.onClick?.(e) }} />
})

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(props, ref) {
  return <RouterNavLink ref={ref} viewTransition={canAnimate()} {...props} onClick={(e) => { markNavigated(); props.onClick?.(e) }} />
})

export function useNavigate() {
  const navigate = useRouterNavigate()
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') return navigate(to)
      markNavigated()
      return navigate(to, { viewTransition: canAnimate(), ...options })
    },
    [navigate],
  )
}

/** True while a view transition to or from `to` is running: the matching photos use it to share one animation name. */
export function useSharedElement(to: string): boolean {
  return useViewTransitionState(to)
}
