import type { RemoteEmployment, RemoteEmploymentList } from '../../shared/types.js'

const BASE = 'https://gateway.remote.com/v1'

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function listAllEmploymentIds(token: string): Promise<string[]> {
  const ids: string[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(`${BASE}/employments?page=${page}&page_size=100`, {
      headers: headers(token),
    })
    if (!res.ok) throw new Error(`Remote API ${res.status}: ${await res.text()}`)
    const json = (await res.json()) as { data: RemoteEmploymentList; [k: string]: unknown }
    const body = json.data
    for (const emp of body.data) ids.push(emp.id)
    totalPages = body.total_pages
    page++
  }

  return ids
}

async function fetchEmployment(id: string, token: string): Promise<RemoteEmployment> {
  const res = await fetch(`${BASE}/employments/${id}`, { headers: headers(token) })
  if (!res.ok) throw new Error(`Remote API ${res.status} for employment ${id}`)
  const json = (await res.json()) as { data: RemoteEmployment }
  return json.data
}

/** Fetch all employment details with bounded concurrency (pool size 8). */
export async function fetchAllEmployments(token: string): Promise<RemoteEmployment[]> {
  const ids = await listAllEmploymentIds(token)
  const results: RemoteEmployment[] = []
  const POOL = 8

  for (let i = 0; i < ids.length; i += POOL) {
    const batch = ids.slice(i, i + POOL)
    const settled = await Promise.allSettled(batch.map((id) => fetchEmployment(id, token)))
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value)
      // silently skip individual fetch failures — rest of org still renders
    }
  }

  return results
}
