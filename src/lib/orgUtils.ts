import type { OrgNode } from '../../shared/types.js'

export type ViewMode = 'tree' | 'list'

export function filterByDept(forest: OrgNode[], depts: Set<string>): OrgNode[] {
  function nodeMatches(node: OrgNode): boolean {
    const d = (!node.attributes.department || node.attributes.department === '—')
      ? 'Unassigned'
      : node.attributes.department
    return depts.has(d)
  }
  function keep(node: OrgNode): OrgNode | null {
    const childMatches = (node.children ?? []).flatMap((c) => { const r = keep(c); return r ? [r] : [] })
    if (nodeMatches(node) || childMatches.length > 0)
      return { ...node, children: childMatches.length ? childMatches : node.children }
    return null
  }
  return forest.flatMap((r) => { const res = keep(r); return res ? [res] : [] })
}

export function filterForest(forest: OrgNode[], query: string): OrgNode[] {
  if (!query) return forest
  const q = query.toLowerCase()
  function matchesNode(node: OrgNode): boolean {
    return node.name.toLowerCase().includes(q)
      || (node.attributes.title ?? '').toLowerCase().includes(q)
      || (node.attributes.department ?? '').toLowerCase().includes(q)
  }
  function filterNode(node: OrgNode): OrgNode | null {
    const childMatches = (node.children ?? []).flatMap((c) => { const r = filterNode(c); return r ? [r] : [] })
    if (matchesNode(node) || childMatches.length > 0)
      return { ...node, children: childMatches.length ? childMatches : node.children }
    return null
  }
  return forest.flatMap((root) => { const r = filterNode(root); return r ? [r] : [] })
}

function flattenForest(forest: OrgNode[], parentName = ''): string[][] {
  const rows: string[][] = []
  for (const node of forest) {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    rows.push([esc(node.name), esc(node.attributes.title ?? ''), esc(node.attributes.department ?? ''), esc(parentName), node.attributes.isExternal ? 'Yes' : 'No'])
    rows.push(...flattenForest(node.children ?? [], node.name))
  }
  return rows
}

export function exportCSV(forest: OrgNode[]) {
  const header = ['Name', 'Title', 'Department', 'Manager', 'External']
  const csv = [header, ...flattenForest(forest)].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'org-chart.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function readParams(): { view: ViewMode; search: string; depts: Set<string> } {
  const p = new URLSearchParams(window.location.search)
  return {
    view: (p.get('view') as ViewMode) ?? 'tree',
    search: p.get('q') ?? '',
    depts: p.get('depts') ? new Set(p.get('depts')!.split(',')) : new Set<string>(),
  }
}
