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
