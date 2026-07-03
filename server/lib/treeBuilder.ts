/**
 * Tree builder — turns the flat Person list into the OrgNode forest the
 * client renders. This is the heart of the server and where all the org
 * edge cases are resolved (see the table in README.md / docs "Edge cases"):
 *
 *   no manager            → root
 *   manager not in dataset (dangling id) → root
 *   external manager (email, no id)      → root + "reports to X" badge
 *   reporting cycle (A→B→A)              → cycle members promoted to roots,
 *                                          which breaks the cycle
 *
 * Why cycles MUST be broken here: react-d3-tree has no cycle protection —
 * a circular structure would recurse forever and crash the page. The server
 * guarantees the client always receives a valid forest of DAGs
 * (see "Cycle Detection at Build Time, Not Render Time" in DECISIONS.md).
 *
 * Debugging: someone appearing at top level unexpectedly means one of the
 * root conditions in the `roots` filter below matched them — check their
 * managerId against the dataset, and look for a badge on their card.
 * Tests: tests/treeBuilder.test.ts exercises every case above.
 */
import type { Person } from './types.js'
import type { OrgNode } from '../../shared/types.js'

/** Badge text shown on the node card for irregular root causes. */
function buildBadge(p: Person, cycleIds: Set<string>): string | undefined {
  if (p.externalManagerEmail) {
    const label = p.externalManagerName ?? p.externalManagerEmail
    return `reports to ${label} (external)`
  }
  if (cycleIds.has(p.id)) return 'cycle detected'
  return undefined
}

/**
 * Recursively convert a Person subtree to OrgNode. `visited` is a belt-and-
 * braces guard: even if a cycle survived detection, a child already on the
 * current path is dropped rather than recursed into (no infinite loop).
 */
function toOrgNode(p: Person, childrenMap: Map<string, Person[]>, visited: Set<string>, cycleIds: Set<string>): OrgNode {
  const badge = buildBadge(p, cycleIds)
  const node: OrgNode = {
    name: p.name ?? 'Unknown Employee',
    attributes: {
      title: p.title ?? undefined,
      department: p.department ?? undefined,
      id: p.id,
      ...(badge ? { badge } : {}),
      ...(p.externalManagerEmail ? { isExternal: true } : {}),
    },
  }

  const children = childrenMap.get(p.id) ?? []
  const safeChildren = children.filter((c) => !visited.has(c.id))

  if (safeChildren.length > 0) {
    const nextVisited = new Set(visited).add(p.id)
    node.children = safeChildren.map((c) => toOrgNode(c, childrenMap, nextVisited, cycleIds))
  }

  return node
}

export function buildForest(people: Person[]): OrgNode[] {
  const byId = new Map(people.map((p) => [p.id, p]))

  // Walk a person's manager chain upward; a repeat visit means the chain
  // loops back on itself (A→B→…→A). O(n·depth) overall — fine at org scale.
  function detectCycle(startId: string): boolean {
    const seen = new Set<string>()
    let current: string | null = startId
    while (current !== null) {
      if (seen.has(current)) return true
      seen.add(current)
      current = byId.get(current)?.managerId ?? null
    }
    return false
  }

  // Every member of a cycle gets flagged (each one's chain loops), so the
  // whole cycle is promoted to roots below — nobody silently disappears.
  const cycleIds = new Set<string>()
  for (const p of people) {
    if (p.managerId && detectCycle(p.id)) cycleIds.add(p.id)
  }

  // manager id → direct reports. Cycle members are deliberately NOT parented
  // under their manager — attaching them would re-create the loop.
  const childrenMap = new Map<string, Person[]>()
  for (const p of people) {
    const parentId = p.managerId
    const parentExists = parentId !== null && byId.has(parentId)
    if (parentExists && !cycleIds.has(p.id)) {
      const list = childrenMap.get(parentId!) ?? []
      list.push(p)
      childrenMap.set(parentId!, list)
    }
  }

  // The four ways to become a root — this predicate is the single source of
  // truth for "why is this person at top level?"
  const roots = people.filter((p) => {
    if (p.managerId === null) return true            // no manager at all
    if (!byId.has(p.managerId)) return true          // dangling manager reference
    if (cycleIds.has(p.id)) return true              // cycle member, promoted
    if (p.externalManagerEmail !== null) return true // manager exists off-Remote
    return false
  })

  return roots.map((r) => toOrgNode(r, childrenMap, new Set([r.id]), cycleIds))
}
