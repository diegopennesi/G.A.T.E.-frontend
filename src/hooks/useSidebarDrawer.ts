import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'

const mobileQuery = '(max-width: 900px)'
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(mobileQuery)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
const getSnapshot = () => window.matchMedia(mobileQuery).matches

/** The desktop sidebar becomes a modal drawer only at the CSS mobile breakpoint. */
export function useSidebarDrawer(isOpen: boolean, close: () => void) {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, () => false)
  const drawerRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const drawer = drawerRef.current
    if (!isMobile || !isOpen || !drawer) return

    const returnTarget = triggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusable = () => Array.from(drawer.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'))
    const focusFirst = () => (focusable()[0] || drawer).focus({ preventScroll: true })
    focusFirst()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      } else if (event.key === 'Tab') {
        const elements = focusable()
        const first = elements[0]
        const last = elements.at(-1)
        if (!first) {
          event.preventDefault()
          drawer.focus({ preventScroll: true })
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer)) {
          event.preventDefault()
          last?.focus({ preventScroll: true })
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus({ preventScroll: true })
        }
      }
    }
    const onFocusIn = (event: FocusEvent) => {
      if (!drawer.contains(event.target as Node)) focusFirst()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      document.body.style.overflow = previousOverflow
      if (returnTarget?.isConnected && returnTarget.getClientRects().length > 0) returnTarget.focus({ preventScroll: true })
    }
  }, [isMobile, isOpen, close])

  return { isMobile, drawerRef, triggerRef }
}
