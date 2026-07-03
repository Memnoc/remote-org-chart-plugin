import type { RemoteEmployment, Person } from './types.js'

/**
 * Org charts show current staff only. The API returns every employment
 * lifecycle state (archived = offboarded; created/invited/initiated =
 * pre-hires who haven't started) — all of those are excluded.
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
    externalManagerEmail:
      raw.manager_email && !raw.manager_employment_id ? raw.manager_email : null,
    externalManagerName:
      raw.manager && !raw.manager_employment_id ? raw.manager : null,
    cycleFlag: false,
  }
}
