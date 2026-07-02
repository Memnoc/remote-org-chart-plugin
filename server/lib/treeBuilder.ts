import type { Person, OrgNode } from '../../shared/types.js'

function buildBadge(p: Person, cycleIds: Set<string>): string | undefined {
  if (p.externalManagerEmail) {
    const label = p.externalManagerName ?? p.externalManagerEmail
    return `reports to ${label} (external)`
  }
  if (cycleIds.has(p.id)) return 'cycle detected'
  return undefined
}

function toOrgNode(p: Person, childrenMap: Map<string, Person[]>, visited: Set<string>, cycleIds: Set<string>): OrgNode {
  const badge = buildBadge(p, cycleIds)
  const node: OrgNode = {
    name: p.name,
    attributes: {
      title: p.title,
      department: p.department,
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

  const cycleIds = new Set<string>()
  for (const p of people) {
    if (p.managerId && detectCycle(p.id)) cycleIds.add(p.id)
  }

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

  const roots = people.filter((p) => {
    if (p.managerId === null) return true
    if (!byId.has(p.managerId)) return true
    if (cycleIds.has(p.id)) return true
    if (p.externalManagerEmail !== null) return true
    return false
  })

  return roots.map((r) => toOrgNode(r, childrenMap, new Set([r.id]), cycleIds))
}
