import type { OrgNode } from '../../shared/types.js'

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

export function filterByDept(forest: OrgNode[], depts: Set<string>): OrgNode[] {
  function nodeMatches(node: OrgNode): boolean {
    return depts.has(node.attributes.department ?? 'Unassigned')
  }
  function keep(node: OrgNode): OrgNode | null {
    const childMatches = (node.children ?? []).flatMap((c) => { const r = keep(c); return r ? [r] : [] })
    if (nodeMatches(node) || childMatches.length > 0)
      return { ...node, children: childMatches.length ? childMatches : node.children }
    return null
  }
  return forest.flatMap((r) => { const res = keep(r); return res ? [res] : [] })
}
