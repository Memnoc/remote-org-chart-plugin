/**
 * Mapper tests — the RemoteEmployment → Person translation and the
 * active-status filter. The external-manager distinction (email set, id
 * absent) is the subtlest rule; if external managers ever misrender, start
 * with those cases.
 */
import { describe, it, expect } from 'vitest'
import { mapEmployment, isActive } from '../server/lib/mapper.js'
import type { RemoteEmployment } from '../shared/types.js'

const base: RemoteEmployment = {
  id: 'emp-001',
  full_name: 'Alice',
  job_title: 'CEO',
  department: 'Executive',
  department_id: 'dept-001',
  manager: null,
  manager_email: null,
  manager_employment_id: null,
  status: 'active',
}

describe('mapEmployment', () => {
  it('maps full employment', () => {
    const p = mapEmployment(base)
    expect(p.id).toBe('emp-001')
    expect(p.name).toBe('Alice')
    expect(p.title).toBe('CEO')
    expect(p.department).toBe('Executive')
    expect(p.managerId).toBeNull()
    expect(p.externalManagerEmail).toBeNull()
  })

  it('keeps null fields null (formatting happens at render)', () => {
    const p = mapEmployment({ ...base, full_name: null, job_title: null, department: null })
    expect(p.name).toBeNull()
    expect(p.title).toBeNull()
    expect(p.department).toBeNull()
  })

  it('sets managerId when manager_employment_id present', () => {
    const p = mapEmployment({ ...base, manager_employment_id: 'emp-002', manager_email: 'b@x.com' })
    expect(p.managerId).toBe('emp-002')
    expect(p.externalManagerEmail).toBeNull()
  })

  it('sets externalManagerEmail when email set but no id', () => {
    const p = mapEmployment({ ...base, manager_email: 'ext@board.com', manager: 'Board Member' })
    expect(p.managerId).toBeNull()
    expect(p.externalManagerEmail).toBe('ext@board.com')
    expect(p.externalManagerName).toBe('Board Member')
  })
})

describe('isActive', () => {
  it('accepts active employments', () => {
    expect(isActive(base)).toBe(true)
  })

  it.each(['archived', 'created', 'invited', 'initiated'])('rejects %s employments', (status) => {
    expect(isActive({ ...base, status })).toBe(false)
  })
})
