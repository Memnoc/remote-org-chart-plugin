import type { OrgNode } from '../../shared/types.js'

export const VIRTUAL_ROOT_ID = '__org__'

/**
 * Join a multi-root forest under one synthetic "Org" root so it renders as a
 * single expandable tree. Render-layer only — the data forest stays honest
 * (see DECISIONS.md). Single-root and empty forests pass through untouched.
 */
export function joinForest(forest: OrgNode[]): OrgNode[] {
  if (forest.length <= 1) return forest
  return [{
    name: 'Org',
    attributes: { id: VIRTUAL_ROOT_ID, isVirtual: true },
    children: forest,
  }]
}

export function treeDepth(node: OrgNode): number {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(treeDepth))
}

export function walkForest(forest: OrgNode[]): { node: OrgNode; depth: number }[] {
  const result: { node: OrgNode; depth: number }[] = []
  function walk(node: OrgNode, depth: number) {
    result.push({ node, depth })
    node.children?.forEach((c) => walk(c, depth + 1))
  }
  forest.forEach((r) => walk(r, 0))
  return result
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
