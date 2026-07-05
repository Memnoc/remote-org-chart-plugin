/**
 * Server-internal types for the Remote API integration.
 *
 * Data flows through three shapes, in order:
 *   RemoteEmploymentList (list endpoint, minimal — NO manager fields)
 *     → RemoteEmployment  (detail endpoint, has manager_employment_id)
 *       → Person          (normalised by mapper.ts, consumed by treeBuilder.ts)
 *
 * None of these cross the HTTP boundary to the browser — the client only ever
 * sees OrgNode/OrgResponse from shared/types.ts. If you need a new field in
 * the UI, thread it: here → mapper.ts → treeBuilder.ts → shared/types.ts.
 *
 * Debugging: if the live fetch dies with "shape unexpected", the API drifted
 * from these interfaces — compare against a raw curl of the endpoint.
 */

/** Raw shape returned by GET /v1/employments/{id} */
export interface RemoteEmployment {
  id: string
  full_name: string | null
  job_title: string | null
  department: string | null
  department_id: string | null
  manager: string | null
  manager_email: string | null
  manager_employment_id: string | null
  status: string
}

/** Raw paginated list response from GET /v1/employments */
export interface RemoteEmploymentList {
  employments: Array<{
    id: string
    full_name: string | null
    job_title: string | null
    department: string | null
    department_id: string | null
    status: string
  }>
  current_page: number
  total_pages: number
  total_count: number
}

/**
 * Normalised person, safe for tree-building; server-internal only.
 * Missing data stays null here — formatting to '—' happens at render
 * (see "Null/Undefined Over Sentinel Strings" in DECISIONS.md).
 */
export interface Person {
  id: string
  name: string | null
  title: string | null
  department: string | null
  /** Employment id of the manager, if the manager is on Remote. Drives the tree. */
  managerId: string | null
  /** Set only when the manager exists but is NOT on Remote (managerId null) — renders as an external-manager root. */
  externalManagerEmail: string | null
  externalManagerName: string | null
}
