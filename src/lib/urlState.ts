/**
 * URL query-param state — the read half of shareable URLs (?q=, ?depts=,
 * ?view=). App.tsx reads this once on mount for initial state; the WRITE
 * half is the history.replaceState effect in App.tsx. There is no router —
 * one screen, so query params on a single path are all we need
 * (see "URL State via history.replaceState Without a Router" in DECISIONS.md).
 */
export type ViewMode = 'tree' | 'list'
const VALID_VIEWS = new Set<ViewMode>(['tree', 'list'])

export function readParams(): { view: ViewMode; search: string; depts: Set<string> } {
  const p = new URLSearchParams(window.location.search)
  const rawView = p.get('view') as ViewMode
  return {
    view: VALID_VIEWS.has(rawView) ? rawView : 'tree',
    search: p.get('q') ?? '',
    depts: new Set((p.get('depts') ?? '').split(',').filter(Boolean)),
  }
}
