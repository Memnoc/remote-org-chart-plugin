import type { OrgNode } from '../../shared/types.js'

export type ViewMode = 'tree' | 'list'

export function isEmpty(val?: string): boolean {
  return !val || val === '—'
}

const DEPT_COLORS: Record<string, string> = {
  engineering: '#22c55e',
  sales: '#10b981',
  executive: '#f59e0b',
  ops: '#ef4444',
  finance: '#ec4899',
  hr: '#22c55e',
  'human resources': '#22c55e',
  marketing: '#3b82f6',
  design: '#06b6d4',
  legal: '#8b5cf6',
  product: '#f97316',
  external: '#64748b',
  unassigned: '#94a3b8',
}

export function deptColor(department?: string): string {
  if (isEmpty(department)) return '#94a3b8'
  const key = department!.toLowerCase()
  for (const [k, v] of Object.entries(DEPT_COLORS)) {
    if (key.includes(k)) return v
  }
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash)
  const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#6366f1']
  return palette[Math.abs(hash) % palette.length]
}

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

export function treeDepth(node: OrgNode): number {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(treeDepth))
}

export function findSubtree(forest: OrgNode[], id: string): OrgNode | null {
  for (const node of forest) {
    if (node.attributes.id === id) return node
    const found = findSubtree(node.children ?? [], id)
    if (found) return found
  }
  return null
}

export function findChain(forest: OrgNode[], targetId: string): Set<string> {
  function search(node: OrgNode, path: string[]): string[] | null {
    const id = node.attributes.id ?? ''
    const next = [...path, id]
    if (id === targetId) return next
    for (const child of node.children ?? []) {
      const r = search(child, next)
      if (r) return r
    }
    return null
  }
  for (const root of forest) {
    const r = search(root, [])
    if (r) return new Set(r)
  }
  return new Set()
}

export function filterByDept(forest: OrgNode[], depts: Set<string>): OrgNode[] {
  function nodeMatches(node: OrgNode): boolean {
    const d = isEmpty(node.attributes.department) ? 'Unassigned' : node.attributes.department!
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
