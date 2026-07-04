/**
 * forestNav tests — the virtual-root join used by TreeView, and the parent
 * lookup behind the drawer's Manager row. joinForest's pass-through identity
 * test matters most: TreeView memoizes on it, and react-d3-tree wipes
 * collapse state if data identity churns (that was the zoom-reset bug).
 */
import { describe, it, expect } from 'vitest'
import { joinForest, findParent, VIRTUAL_ROOT_ID } from '../src/lib/forestNav.ts'
import type { OrgNode } from '../shared/types.js'

function node(id: string, children?: OrgNode[]): OrgNode {
  return { name: id, attributes: { id }, ...(children ? { children } : {}) }
}

describe('joinForest', () => {
  it('passes an empty forest through', () => {
    expect(joinForest([])).toEqual([])
  })

  it('passes a single-root forest through untouched', () => {
    const forest = [node('a', [node('b')])]
    expect(joinForest(forest)).toBe(forest)
  })

  it('joins multiple roots under one virtual root', () => {
    const a = node('a', [node('b')])
    const c = node('c')
    const joined = joinForest([a, c])
    expect(joined).toHaveLength(1)
    const root = joined[0]
    expect(root.attributes.id).toBe(VIRTUAL_ROOT_ID)
    expect(root.attributes.isVirtual).toBe(true)
    expect(root.children).toEqual([a, c])
  })

  it('does not mutate the input forest', () => {
    const forest = [node('a'), node('b')]
    joinForest(forest)
    expect(forest).toHaveLength(2)
    expect(forest[0].attributes.id).toBe('a')
  })
})

describe('findParent', () => {
  it('finds the direct parent at any depth', () => {
    const forest = [node('a', [node('b', [node('c')])])]
    expect(findParent(forest, 'b')?.attributes.id).toBe('a')
    expect(findParent(forest, 'c')?.attributes.id).toBe('b')
  })

  it('returns null for roots and unknown ids', () => {
    const forest = [node('a', [node('b')])]
    expect(findParent(forest, 'a')).toBeNull()
    expect(findParent(forest, 'nope')).toBeNull()
  })

  it('treats the virtual Org root as no parent', () => {
    const joined = joinForest([node('a', [node('b')]), node('c')])
    expect(findParent(joined, 'a')).toBeNull()
    expect(findParent(joined, 'c')).toBeNull()
    expect(findParent(joined, 'b')?.attributes.id).toBe('a')
  })
})
