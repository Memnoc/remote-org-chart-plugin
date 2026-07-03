import type { OrgNode } from '../../shared/types.js'

export type PersonDetail = {
  name: string
  title?: string
  department?: string
  isExternal?: boolean
  badge?: string
}

export interface OrgStats {
  total: number
  managers: number
  avgSpan: number
  deepest: number
  deptList: [string, number][]
}

export function buildDeptList(allNodes: OrgNode[]): [string, number][] {
  const map = new Map<string, number>()
  for (const n of allNodes) {
    const d = n.attributes.department ?? 'Unassigned'
    map.set(d, (map.get(d) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

export function computeStats(allNodes: OrgNode[], forest: OrgNode[]): OrgStats {
  const managers = allNodes.filter((n) => (n.children?.length ?? 0) > 0)
  const avgSpan = managers.length > 0
    ? managers.reduce((s, m) => s + (m.children?.length ?? 0), 0) / managers.length
    : 0
  function maxDepth(node: OrgNode): number {
    if (!node.children?.length) return 1
    return 1 + Math.max(...node.children.map(maxDepth))
  }
  const deepest = forest.length > 0 ? Math.max(...forest.map(maxDepth)) : 0
  return {
    total: allNodes.length,
    managers: managers.length,
    avgSpan: +avgSpan.toFixed(1),
    deepest,
    deptList: buildDeptList(allNodes),
  }
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

export function deptColor(department?: string | null): string {
  if (!department) return '#94a3b8'
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

export function toPersonDetail(node: { name: string; attributes?: { title?: string | null; department?: string | null; isExternal?: boolean; badge?: string } }): PersonDetail {
  return {
    name: node.name,
    title: node.attributes?.title ?? undefined,
    department: node.attributes?.department ?? undefined,
    isExternal: node.attributes?.isExternal,
    badge: node.attributes?.badge,
  }
}
