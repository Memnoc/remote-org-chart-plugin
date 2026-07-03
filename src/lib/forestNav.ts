/**
 * Forest navigation — pure tree-walking helpers shared by TreeView, ListView
 * and App. No React, no I/O; unit-tested in tests/forestNav.test.ts.
 *
 * Mental model: the server sends a *forest* (multiple roots are real — see
 * treeBuilder.ts for the four root causes). Everything here either walks it
 * (walkForest/findSubtree/findChain), measures it (treeDepth), or joins it
 * for display (joinForest).
 */
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

/** Longest root-to-leaf path. Drives SingleTree's canvas height and the "Deepest chain" stat. */
export function treeDepth(node: OrgNode): number {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(treeDepth))
}

/** Depth-first flatten with depth per node — the row order of ListView and the CSV export. */
export function walkForest(forest: OrgNode[]): { node: OrgNode; depth: number }[] {
  const result: { node: OrgNode; depth: number }[] = []
  function walk(node: OrgNode, depth: number) {
    result.push({ node, depth })
    node.children?.forEach((c) => walk(c, depth + 1))
  }
  forest.forEach((r) => walk(r, 0))
  return result
}

/** Locate a node anywhere in the forest — powers Subtree Focus ("View team →"). */
export function findSubtree(forest: OrgNode[], id: string): OrgNode | null {
  for (const node of forest) {
    if (node.attributes.id === id) return node
    const found = findSubtree(node.children ?? [], id)
    if (found) return found
  }
  return null
}

/**
 * Ids on the path root→target (inclusive) — powers the amber reporting-chain
 * highlight. Returned as a Set because both NodeCard (border) and SingleTree's
 * pathClassFunc (connector stroke) do membership checks per node/link.
 */
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
