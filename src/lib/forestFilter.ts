/**
 * Search & department filters for the forest. Both filters share one rule:
 * a node is kept if IT matches or ANY DESCENDANT matches — ancestors of a
 * match survive so the tree never shows an orphaned hit without its chain.
 * Ancestors kept that way are marked `attributes.isContext` so NodeCard and
 * ListView render them dimmed: matches pop, chain stays navigable.
 *
 * Two subtleties worth knowing before "fixing" anything here:
 * - Non-mutating: matched nodes are shallow-copied ({ ...node }); the
 *   original forest from useOrg is never touched.
 * - `children: childMatches.length ? childMatches : node.children` — when a
 *   node matches directly but no child does, it keeps its FULL subtree
 *   (searching a manager shows their whole team, which is the intent).
 *
 * App.tsx applies them in order: search first, then department.
 */
import type { OrgNode } from '../../shared/types.js'

/** Case-insensitive substring match across name, title and department. */
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
    const direct = matchesNode(node)
    if (!direct && childMatches.length === 0) return null
    return {
      ...node,
      // Kept only for its descendants → mark as context so the UI can dim it.
      // A direct match keeps its attributes as-is (an isContext flag from an
      // earlier filter stage survives — it still isn't a match of THAT filter).
      attributes: direct ? node.attributes : { ...node.attributes, isContext: true },
      children: childMatches.length ? childMatches : node.children,
    }
  }
  return forest.flatMap((root) => { const r = filterNode(root); return r ? [r] : [] })
}

/** Keep nodes whose department is in the active set ('Unassigned' when missing). OR within the set. */
export function filterByDept(forest: OrgNode[], depts: Set<string>): OrgNode[] {
  function nodeMatches(node: OrgNode): boolean {
    return depts.has(node.attributes.department ?? 'Unassigned')
  }
  function keep(node: OrgNode): OrgNode | null {
    const childMatches = (node.children ?? []).flatMap((c) => { const r = keep(c); return r ? [r] : [] })
    const direct = nodeMatches(node)
    if (!direct && childMatches.length === 0) return null
    return {
      ...node,
      attributes: direct ? node.attributes : { ...node.attributes, isContext: true },
      children: childMatches.length ? childMatches : node.children,
    }
  }
  return forest.flatMap((r) => { const res = keep(r); return res ? [res] : [] })
}
