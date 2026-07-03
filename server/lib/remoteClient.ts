import type { RemoteEmployment, RemoteEmploymentList } from './types.js'

const BASE = 'https://gateway.remote-sandbox.com/v1'

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

const TIMEOUT_MS = 10_000

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
    const json = (await res.json()) as { data: RemoteEmploymentList; [k: string]: unknown }
    const body = json.data
    for (const emp of body.employments) ids.push(emp.id)
    totalPages = body.total_pages
    console.log(`[remote] list page ${page}/${totalPages} — ${body.employments.length} ids (total so far: ${ids.length})`)
    page++
  }

  console.log(`[remote] id collection done — ${ids.length} employments across ${totalPages} page(s)`)
  return ids
}

async function fetchEmployment(id: string, token: string): Promise<RemoteEmployment> {
  const res = await fetch(`${BASE}/employments/${id}`, { headers: headers(token), signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Remote API ${res.status} for employment ${id}`)
  const json = (await res.json()) as { data: { employment: RemoteEmployment } }
  return json.data.employment
}

/** Fetch all employment details with bounded concurrency (pool size 8). */
export async function fetchAllEmployments(token: string): Promise<RemoteEmployment[]> {
  const ids = await listAllEmploymentIds(token)
  const results: RemoteEmployment[] = []
  const POOL = 8
  const totalBatches = Math.ceil(ids.length / POOL)

  for (let i = 0; i < ids.length; i += POOL) {
    const batchNum = Math.floor(i / POOL) + 1
    const batch = ids.slice(i, i + POOL)
    const settled = await Promise.allSettled(batch.map((id) => fetchEmployment(id, token)))
    let ok = 0
    for (const [j, r] of settled.entries()) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
        ok++
      } else {
        console.warn(`[remote] batch ${batchNum} — SKIP ${batch[j]}: ${r.reason}`)
      }
    }
    console.log(`[remote] batch ${batchNum}/${totalBatches} — ${ok}/${batch.length} ok`)
  }

  console.log(`[remote] detail fetch done — ${results.length}/${ids.length} employments fetched`)
  return results
}
