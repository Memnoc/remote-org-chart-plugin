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

/** Normalised person, safe for tree-building; server-internal only */
export interface Person {
  id: string
  name: string | null
  title: string | null
  department: string | null
  managerId: string | null
  externalManagerEmail: string | null
  externalManagerName: string | null
  cycleFlag: boolean
}
