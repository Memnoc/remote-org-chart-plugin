/**
 * forestFilter tests — the keep-ancestors rule and the isContext marking
 * that drives the dimmed rendering. If dimming ever looks wrong in the UI,
 * these tests tell you whether the flag or the rendering is at fault.
 */
import { describe, it, expect } from 'vitest'
import { filterForest, filterByDept } from '../src/lib/forestFilter.js'
import type { OrgNode } from '../shared/types.js'

function node(id: string, dept: string | undefined, children: OrgNode[] = []): OrgNode {
  return {
    name: id,
    attributes: { id, title: `${id} title`, department: dept },
    ...(children.length ? { children } : {}),
  }
}

describe('filterForest (search)', () => {
  it('marks ancestors of a match as context, not the match itself', () => {
    const forest = [node('root', 'Sales', [node('mid', 'Sales', [node('alice', 'Engineering')])])]
    const result = filterForest(forest, 'alice')
    expect(result).toHaveLength(1)
    expect(result[0].attributes.isContext).toBe(true)
    expect(result[0].children![0].attributes.isContext).toBe(true)
    expect(result[0].children![0].children![0].attributes.isContext).toBeUndefined()
  })

  it('does not mark the subtree kept under a directly-matching manager', () => {
    const forest = [node('boss', 'Sales', [node('report', 'Engineering')])]
    const result = filterForest(forest, 'boss')
    expect(result[0].attributes.isContext).toBeUndefined()
    // full team kept, unmarked — the team is the payload, not context
    expect(result[0].children![0].attributes.isContext).toBeUndefined()
  })

  it('does not mutate the original forest', () => {
    const forest = [node('root', 'Sales', [node('alice', 'Engineering')])]
    filterForest(forest, 'alice')
    expect(forest[0].attributes.isContext).toBeUndefined()
  })
})

describe('filterByDept', () => {
  it('marks non-matching ancestors as context', () => {
    const forest = [node('hrboss', 'HR', [node('orphan', undefined)])]
    const result = filterByDept(forest, new Set(['Unassigned']))
    expect(result[0].attributes.isContext).toBe(true)
    expect(result[0].children![0].attributes.isContext).toBeUndefined()
  })

  it('preserves a context flag from the search stage even on a dept match', () => {
    // "alice" search keeps her manager as context; the manager's dept then
    // matches the dept filter directly — she still wasn't a search match,
    // so the flag (and the dimming) must survive.
    const forest = [node('manager', 'HR', [node('alice', 'HR')])]
    const afterSearch = filterForest(forest, 'alice')
    const afterDept = filterByDept(afterSearch, new Set(['HR']))
    expect(afterDept[0].attributes.isContext).toBe(true)
    expect(afterDept[0].children![0].attributes.isContext).toBeUndefined()
  })
})
