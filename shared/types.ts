/**
 * The HTTP contract between server and client — the ONLY types both sides
 * share. Deliberately minimal: server internals (RemoteEmployment, Person)
 * and client-only types (PersonDetail, OrgStats) live on their own sides
 * (see "Shared TypeScript Types: HTTP Contract Only" in DECISIONS.md).
 *
 * OrgNode's shape (name + attributes + children) is dictated by
 * react-d3-tree's RawNodeDatum — don't restructure it without checking the
 * library. New display fields go in `attributes`.
 */

/** Tree node used by react-d3-tree */
export interface OrgNode {
  name: string
  attributes: {
    title?: string
    department?: string
    id: string
    badge?: string
    isExternal?: boolean
    /** Synthetic render-layer root joining a multi-root forest — not a person */
    isVirtual?: boolean
  }
  children?: OrgNode[]
}

/** /api/org response envelope */
export interface OrgResponse {
  forest: OrgNode[]
  /** 'live' = fetched from Remote API; 'snapshot' = fallback data */
  source: 'live' | 'snapshot'
  fetchedAt: string
  /** Number of employees silently dropped due to detail-fetch failures */
  skippedCount?: number
}
