/**
 * useDropdown — shared open/close behaviour for popover panels (theme picker
 * in Header, filter panel in Toolbar). Owns the two standard dismissals:
 * Escape and click-outside. Attach `triggerRef` to the button and `panelRef`
 * to the panel — clicks inside either do NOT close (that's the two
 * `contains` checks below).
 */
import { useState, useRef, useEffect } from 'react'

export function useDropdown() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only listen while open — no global listeners for closed dropdowns.
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onClickOutside(e: MouseEvent) {
      if (!triggerRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [open])

  return { open, setOpen, triggerRef, panelRef }
}
