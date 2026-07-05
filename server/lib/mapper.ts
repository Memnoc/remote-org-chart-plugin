/**
 * Mapper — normalises raw Remote API employments into the internal Person
 * shape that treeBuilder.ts consumes. Pure functions, no I/O; the easiest
 * layer to unit test (tests/mapper.test.ts) and the single place where the
 * API's field names are translated, so an API rename touches only this file.
 */
import type { RemoteEmployment, Person } from './types.js'

/**
 * Org charts show current staff only. The API returns every employment
 * lifecycle state (archived = offboarded; created/invited/initiated =
 * pre-hires who haven't started) — all of those are excluded.
 * Measured on the sandbox org: 175 employments = 148 active + 27 other
 * (see "Active-Only Employment Filter" in DECISIONS.md).
 */
export function isActive(raw: RemoteEmployment): boolean {
  return raw.status === 'active'
}

export function mapEmployment(raw: RemoteEmployment): Person {
  return {
    id: raw.id,
    name: raw.full_name ?? null,
    title: raw.job_title ?? null,
    department: raw.department ?? null,
    managerId: raw.manager_employment_id ?? null,
    // External manager = manager_email set but NO manager_employment_id:
    // the person reports to someone who is not on Remote. Both fields set
    // means an on-Remote manager, so external stays null.
    externalManagerEmail:
      raw.manager_email && !raw.manager_employment_id ? raw.manager_email : null,
    externalManagerName:
      raw.manager && !raw.manager_employment_id ? raw.manager : null,
  }
}
