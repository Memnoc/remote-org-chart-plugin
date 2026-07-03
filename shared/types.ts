/** Tree node used by react-d3-tree */
export interface OrgNode {
  name: string
  attributes: {
    title?: string
    department?: string
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
