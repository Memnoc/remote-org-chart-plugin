/**
 * forestNav tests — every walker in the module. joinForest's pass-through
 * identity test matters most: TreeView memoizes on it, and react-d3-tree
 * wipes collapse state if data identity churns (that was the zoom-reset
 * bug). findChain's unique-path guarantee is what the amber chain highlight
 * (and the "no dotted-line reports" data model) leans on.
 */
import { describe, it, expect } from 'vitest'
import {
  joinForest, findParent, findSubtree, findChain, treeDepth, walkForest, VIRTUAL_ROOT_ID,
} from '../src/lib/forestNav.ts'
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

describe('findSubtree', () => {
  it('locates a node at any depth, across roots', () => {
    const forest = [node('a', [node('b', [node('c')])]), node('d')]
    expect(findSubtree(forest, 'a')?.attributes.id).toBe('a')
    expect(findSubtree(forest, 'c')?.attributes.id).toBe('c')
    expect(findSubtree(forest, 'd')?.attributes.id).toBe('d')
  })

  it('returns the node with its subtree intact, not a copy', () => {
    const b = node('b', [node('c')])
    const forest = [node('a', [b])]
    expect(findSubtree(forest, 'b')).toBe(b)
  })

  it('returns null for an unknown id', () => {
    expect(findSubtree([node('a')], 'nope')).toBeNull()
  })
})

describe('findChain', () => {
  it('returns the full root→target path, inclusive of both ends', () => {
    const forest = [node('a', [node('b', [node('c')]), node('x')])]
    expect(findChain(forest, 'c')).toEqual(new Set(['a', 'b', 'c']))
  })

  it('excludes siblings and other branches', () => {
    const forest = [node('a', [node('b', [node('c')]), node('x', [node('y')])])]
    const chain = findChain(forest, 'c')
    expect(chain.has('x')).toBe(false)
    expect(chain.has('y')).toBe(false)
  })

  it('chain to a root is just the root', () => {
    expect(findChain([node('a', [node('b')])], 'a')).toEqual(new Set(['a']))
  })

  it('unknown target yields an empty set (nothing highlights)', () => {
    expect(findChain([node('a')], 'nope')).toEqual(new Set())
  })

  it('includes the virtual root id when searching a joined forest', () => {
    const joined = joinForest([node('a', [node('b')]), node('c')])
    // Virtual root sits on the path — the connector from Organisation to the
    // person's root is part of the highlighted chain.
    expect(findChain(joined, 'b')).toEqual(new Set([VIRTUAL_ROOT_ID, 'a', 'b']))
  })
})

describe('treeDepth', () => {
  it('leaf is depth 1, chain of three is depth 3', () => {
    expect(treeDepth(node('a'))).toBe(1)
    expect(treeDepth(node('a', [node('b', [node('c')])]))).toBe(3)
  })

  it('takes the longest branch, not the first', () => {
    expect(treeDepth(node('a', [node('b'), node('c', [node('d')])]))).toBe(3)
  })
})

describe('walkForest', () => {
  it('depth-first: a parent directly precedes its reports, with depths', () => {
    const forest = [node('a', [node('b', [node('c')]), node('d')]), node('e')]
    expect(walkForest(forest).map(({ node: n, depth }) => `${n.attributes.id}:${depth}`))
      .toEqual(['a:0', 'b:1', 'c:2', 'd:1', 'e:0'])
  })
})
