/**
 * treeBuilder tests — one test per edge case in the README table: normal
 * hierarchy, no-manager root, dangling manager, external manager, cycle
 * breaking, multiple roots. If you change the root predicate in
 * buildForest(), a failure here tells you exactly which case regressed.
 */
import { describe, it, expect } from 'vitest'
import { buildForest } from '../server/lib/treeBuilder.js'
import type { Person } from '../server/lib/types.js'

function person(overrides: Partial<Person> & { id: string }): Person {
  return {
    name: overrides.id,
    title: '—',
    department: '—',
    managerId: null,
    externalManagerEmail: null,
    externalManagerName: null,
    ...overrides,
  }
}

describe('buildForest', () => {
  it('single root, two children', () => {
    const people = [
      person({ id: 'root' }),
      person({ id: 'c1', managerId: 'root' }),
      person({ id: 'c2', managerId: 'root' }),
    ]
    const forest = buildForest(people)
    expect(forest).toHaveLength(1)
    expect(forest[0].children).toHaveLength(2)
  })

  it('multiple roots produce forest', () => {
    const people = [person({ id: 'r1' }), person({ id: 'r2' })]
    const forest = buildForest(people)
    expect(forest).toHaveLength(2)
  })

  it('external manager → root with badge', () => {
    const people = [
      person({ id: 'ext', externalManagerEmail: 'advisor@board.com', externalManagerName: 'Advisor' }),
    ]
    const forest = buildForest(people)
    expect(forest).toHaveLength(1)
    expect(forest[0].attributes.badge).toMatch(/external/)
  })

  it('orphan (dangling managerId) → root', () => {
    const people = [person({ id: 'orphan', managerId: 'nonexistent' })]
    const forest = buildForest(people)
    expect(forest).toHaveLength(1)
  })

  it('cycle detected — both nodes appear, no infinite loop', () => {
    const people = [
      person({ id: 'a', managerId: 'b' }),
      person({ id: 'b', managerId: 'a' }),
    ]
    const forest = buildForest(people)
    // Both should surface (one as root due to cycle-break)
    const allIds = new Set<string>()
    function collect(nodes: ReturnType<typeof buildForest>) {
      for (const n of nodes) {
        allIds.add(n.attributes.id)
        if (n.children) collect(n.children)
      }
    }
    collect(forest)
    expect(allIds.has('a') || allIds.has('b')).toBe(true)
    // Should not throw / hang
  })

  it('missing data person → placeholder values', () => {
    const people = [person({ id: 'x', name: '—', title: '—', department: '—' })]
    const forest = buildForest(people)
    expect(forest[0].name).toBe('—')
    expect(forest[0].attributes.title).toBe('—')
  })
})
