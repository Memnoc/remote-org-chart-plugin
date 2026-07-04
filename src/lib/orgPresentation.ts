/**
 * Presentation helpers — everything about how org data LOOKS: stats,
 * department colours, avatar initials, and the OrgNode → PersonDetail
 * projection for the detail drawer. Pure functions, no React.
 *
 * This file (plus orgExport/forestNav/forestFilter) is the result of
 * splitting a former orgUtils god module — one reason to change per file
 * (see "orgUtils God Module Split" in DECISIONS.md).
 */
import type { OrgNode } from '../../shared/types.js'

/** What the DetailPanel drawer needs — a flat view-model, not a tree node. */
export type PersonDetail = {
  name: string
  title?: string
  department?: string
  isExternal?: boolean
  badge?: string
  /** The person's manager (tree parent), when they have one on Remote. */
  manager?: { name: string; title?: string; department?: string }
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

// Known departments get fixed colours (matched by substring, lowercase).
// Unknown departments fall through to a stable hash-derived colour below,
// so a new department is always coloured and always the SAME colour.
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
  // djb2-style string hash → deterministic palette pick for unknown depts.
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash)
  const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#6366f1']
  return palette[Math.abs(hash) % palette.length]
}

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

export function toPersonDetail(
  node: { name: string; attributes?: { title?: string | null; department?: string | null; isExternal?: boolean; badge?: string } },
  parent?: { name: string; attributes?: { title?: string | null; department?: string | null } } | null,
): PersonDetail {
  return {
    name: node.name,
    title: node.attributes?.title ?? undefined,
    department: node.attributes?.department ?? undefined,
    isExternal: node.attributes?.isExternal,
    badge: node.attributes?.badge,
    ...(parent ? {
      manager: {
        name: parent.name,
        title: parent.attributes?.title ?? undefined,
        department: parent.attributes?.department ?? undefined,
      },
    } : {}),
  }
}
