export type ViewMode = 'tree' | 'list'

export function readParams(): { view: ViewMode; search: string; depts: Set<string> } {
  const p = new URLSearchParams(window.location.search)
  return {
    view: (p.get('view') as ViewMode) ?? 'tree',
    search: p.get('q') ?? '',
    depts: p.get('depts') ? new Set(p.get('depts')!.split(',')) : new Set<string>(),
  }
}
