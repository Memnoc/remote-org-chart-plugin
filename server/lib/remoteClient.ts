/**
 * Remote API client — the only file that talks to the Remote HTTP API.
 *
 * Why two phases (list then per-id detail): the list endpoint returns a
 * minimal employment with NO manager fields; manager_employment_id exists
 * only on the detail endpoint. There is no bulk-detail endpoint, so an
 * N+1 fetch is forced by the API, mitigated with a concurrency pool of 8
 * and the server's 5-minute cache (see DECISIONS.md).
 *
 * Failure policy: a single bad employee must never kill the whole org.
 * Detail fetches run through Promise.allSettled — failures are counted as
 * `skipped` (surfaced as the amber badge in the app Header) and logged.
 * A failed LIST page, by contrast, throws: without the full id set the
 * forest would be silently wrong.
 *
 * Debugging: every batch logs `[remote] batch N/M — ok/total`. Look for
 * SKIP lines to find exactly which employment id failed and why. "shape
 * unexpected" means the API contract drifted — compare with a raw curl.
 */
import type { RemoteEmployment, RemoteEmploymentList } from './types.js'

const BASE = 'https://gateway.remote-sandbox.com/v1'

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

// Per-request cap. A hung request would otherwise stall its whole batch of 8.
const TIMEOUT_MS = 10_000

/** Phase 1: page through the list endpoint and collect every employment id. */
async function listAllEmploymentIds(token: string): Promise<string[]> {
  const ids: string[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(`${BASE}/employments?page=${page}&page_size=100`, {
      headers: headers(token),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`Remote API ${res.status}: ${await res.text()}`)
    const json = await res.json() as { data: RemoteEmploymentList; [k: string]: unknown }
    if (!Array.isArray(json?.data?.employments)) {
      throw new Error(`Remote list API shape unexpected: ${JSON.stringify(Object.keys(json ?? {}))}`)
    }
    const body = json.data
    for (const emp of body.employments) ids.push(emp.id)
    totalPages = body.total_pages
    console.log(`[remote] list page ${page}/${totalPages} — ${body.employments.length} ids (total so far: ${ids.length})`)
    page++
  }

  console.log(`[remote] id collection done — ${ids.length} employments across ${totalPages} page(s)`)
  return ids
}

/** Phase 2: fetch one employment's detail — the only source of manager fields. */
async function fetchEmployment(id: string, token: string): Promise<RemoteEmployment> {
  const res = await fetch(`${BASE}/employments/${id}`, { headers: headers(token), signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Remote API ${res.status} for employment ${id}`)
  const json = await res.json() as { data: { employment: RemoteEmployment } }
  if (json?.data?.employment == null) {
    throw new Error(`Remote detail API shape unexpected for ${id}: ${JSON.stringify(Object.keys(json ?? {}))}`)
  }
  return json.data.employment
}

/**
 * Fetch all employment details with bounded concurrency (pool size 8).
 * Pool of 8 balances throughput against unknown Remote rate limits — a
 * 175-person org completes in ~22 batches. Individual failures are skipped
 * (allSettled), never fatal; the skip count rides back to the UI as
 * OrgResponse.skippedCount.
 */
export async function fetchAllEmployments(token: string): Promise<{ employments: RemoteEmployment[], skipped: number }> {
  const ids = await listAllEmploymentIds(token)
  const employments: RemoteEmployment[] = []
  const POOL = 8
  const totalBatches = Math.ceil(ids.length / POOL)
  let skipped = 0

  for (let i = 0; i < ids.length; i += POOL) {
    const batchNum = Math.floor(i / POOL) + 1
    const batch = ids.slice(i, i + POOL)
    const settled = await Promise.allSettled(batch.map((id) => fetchEmployment(id, token)))
    let ok = 0
    for (const [j, r] of settled.entries()) {
      if (r.status === 'fulfilled') {
        employments.push(r.value)
        ok++
      } else {
        skipped++
        console.warn(`[remote] batch ${batchNum} — SKIP ${batch[j]}: ${r.reason}`)
      }
    }
    console.log(`[remote] batch ${batchNum}/${totalBatches} — ${ok}/${batch.length} ok`)
  }

  console.log(`[remote] detail fetch done — ${employments.length}/${ids.length} fetched, ${skipped} skipped`)
  return { employments, skipped }
}
