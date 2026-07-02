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

/** Normalised person, safe for display */
export interface Person {
  id: string
  name: string
  title: string
  department: string
  /** null = root; populated if manager is on Remote */
  managerId: string | null
  /** set when manager exists but is off-Remote */
  externalManagerEmail: string | null
  externalManagerName: string | null
  /** true if this node was detected inside a reporting cycle */
  cycleFlag: boolean
}

/** Tree node used by react-d3-tree */
export interface OrgNode {
  name: string
  attributes: {
    title: string
    department: string
    id: string
    badge?: string
    isExternal?: boolean
  }
  children?: OrgNode[]
}

/** /api/org response envelope */
export interface OrgResponse {
  forest: OrgNode[]
  /** 'live' = fetched from Remote API; 'snapshot' = fallback data */
  source: 'live' | 'snapshot'
  fetchedAt: string
}
