/**
 * orgPresentation tests — the numbers on the stats panel and the drawer's
 * view-model. computeStats is the highest-risk module here: a wrong average
 * span or deepest chain renders *plausibly* (nobody eyeballs 4.2 vs 4.4),
 * so only a test catches it.
 */
import { describe, it, expect } from 'vitest'
import { computeStats, buildDeptList, deptColor, initials, toPersonDetail } from '../src/lib/orgPresentation.ts'
import type { OrgNode } from '../shared/types.js'

function node(id: string, attrs: Partial<OrgNode['attributes']> = {}, children?: OrgNode[]): OrgNode {
  return { name: id, attributes: { id, ...attrs }, ...(children ? { children } : {}) }
}

describe('computeStats', () => {
  //      a           e
  //     / \
  //    b   c
  //        |
  //        d
  const forest = [
    node('a', {}, [node('b'), node('c', {}, [node('d')])]),
    node('e'),
  ]
  const allNodes = [
    forest[0], forest[0].children![0], forest[0].children![1],
    forest[0].children![1].children![0], forest[1],
  ]

  it('counts totals and managers', () => {
    const s = computeStats(allNodes, forest)
    expect(s.total).toBe(5)
    expect(s.managers).toBe(2) // a and c; leaves and the childless root are not managers
  })

  it('averages span over managers only', () => {
    // a has 2 reports, c has 1 → (2+1)/2 = 1.5
    expect(computeStats(allNodes, forest).avgSpan).toBe(1.5)
  })

  it('deepest chain is the longest root-to-leaf path across the forest', () => {
    expect(computeStats(allNodes, forest).deepest).toBe(3) // a → c → d
  })

  it('empty org: zeros, no division by zero', () => {
    const s = computeStats([], [])
    expect(s).toMatchObject({ total: 0, managers: 0, avgSpan: 0, deepest: 0 })
  })

  it('rounds average span to one decimal', () => {
    // one manager with 3 reports, one with 1, one with 1 → 5/3 = 1.666… → 1.7
    const f = [
      node('m1', {}, [node('r1'), node('r2'), node('r3')]),
      node('m2', {}, [node('r4')]),
      node('m3', {}, [node('r5')]),
    ]
    const all = f.flatMap((m) => [m, ...(m.children ?? [])])
    expect(computeStats(all, f).avgSpan).toBe(1.7)
  })
})

describe('buildDeptList', () => {
  it('counts per department, sorted descending, nulls bucketed as Unassigned', () => {
    const nodes = [
      node('1', { department: 'Engineering' }),
      node('2', { department: 'Engineering' }),
      node('3', { department: 'Sales' }),
      node('4', {}),
    ]
    expect(buildDeptList(nodes)).toEqual([['Engineering', 2], ['Sales', 1], ['Unassigned', 1]])
  })
})

describe('deptColor', () => {
  it('is deterministic for unknown departments', () => {
    expect(deptColor('Wizardry')).toBe(deptColor('Wizardry'))
  })

  it('matches known departments case-insensitively and by substring', () => {
    expect(deptColor('ENGINEERING')).toBe(deptColor('engineering'))
    expect(deptColor('Sales EMEA')).toBe(deptColor('sales'))
  })
})

describe('initials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initials('Alice Johnson')).toBe('AJ')
    expect(initials('Alice Betty Carol')).toBe('AB')
    expect(initials('alice')).toBe('A')
  })
})

describe('toPersonDetail', () => {
  const person = node('p', { title: 'Engineer', department: 'Engineering' }, [
    node('r1', { department: 'Sales' }),
    node('r2', {}),
  ])
  const boss = node('m', { title: 'CTO', department: 'Executive' })

  it('projects org fields, manager, and reports', () => {
    const d = toPersonDetail(person, boss)
    expect(d.name).toBe('p')
    expect(d.title).toBe('Engineer')
    expect(d.manager).toEqual({ name: 'm', title: 'CTO', department: 'Executive' })
    expect(d.reports).toEqual([
      { name: 'r1', department: 'Sales' },
      { name: 'r2', department: undefined },
    ])
  })

  it('omits manager for roots and reports for leaves', () => {
    const d = toPersonDetail(node('leaf'), null)
    expect(d.manager).toBeUndefined()
    expect(d.reports).toBeUndefined()
  })

  it('normalises nulls to undefined (render layer never sees null)', () => {
    const d = toPersonDetail({ name: 'x', attributes: { title: null, department: null } })
    expect(d.title).toBeUndefined()
    expect(d.department).toBeUndefined()
  })
})
