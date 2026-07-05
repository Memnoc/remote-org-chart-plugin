/**
 * useIsNarrow — true below the phone breakpoint (640px). Drives the few
 * layout switches that inline styles can't express with media queries:
 * toolbar wrapping, hidden header details, no D-pad on the canvas.
 *
 * matchMedia is an external store — subscribe with the primitive built for
 * it, same pattern as useTheme's prefers-color-scheme subscription.
 * (react.dev/learn/you-might-not-need-an-effect — "Subscribing to an external store")
 */
import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 640px)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
