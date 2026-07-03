/**
 * Express server — the single production process. Serves three things from
 * one origin (no CORS anywhere): the /api routes, the compiled SPA (dist/),
 * and /health for Render's health check. The docs site is NOT served here —
 * it lives on GitHub Pages (see "Docs Site" ADR in DECISIONS.md).
 *
 * Request lifecycle for GET /api/org:
 *   cache fresh? → serve cache
 *   token set?   → live fetch (remoteClient) → filter active (mapper)
 *                  → buildForest (treeBuilder) → cache → serve
 *   no token / live fetch throws → snapshot.json fallback → serve
 * The client learns which path ran via OrgResponse.source ('live'|'snapshot')
 * — that's the green/amber dot in the app Header.
 *
 * ⚠ Express 4 gotcha: async route handler REJECTIONS bypass the error
 * middleware at the bottom of this file. Every async route here wraps its
 * awaits in try/catch — keep doing that for new routes (see "Express 4 Async
 * Route Handlers" ADR in DECISIONS.md).
 *
 * Debugging: all server logs are prefixed — [org] for route/orchestration,
 * [remote] for API client batches, [server] for unhandled errors. On Render,
 * these are in the service logs.
 */
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import type { OrgResponse } from '../shared/types.js'
import type { RemoteEmployment } from './lib/types.js'
import { fetchAllEmployments } from './lib/remoteClient.js'
import { mapEmployment, isActive } from './lib/mapper.js'
import { buildForest } from './lib/treeBuilder.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3001

// In-memory cache — one module-level variable, per-process (fine for a
// single Render instance; would need Redis if scaled out — see DECISIONS.md).
// POST /api/org/refresh nulls it; the client Refresh button calls that.
let cache: OrgResponse | null = null
let cacheTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min

/**
 * Fallback data path. snapshot.json is a committed seed dataset that doubles
 * as the tree-builder test fixture — it contains every edge case (cycle,
 * dangling manager, external manager, missing fields). Guarantees a reviewer
 * always sees a working chart even with no token or a dead API.
 */
function loadSnapshot(): OrgResponse {
  let raw: string
  try {
    raw = readFileSync(path.join(process.cwd(), 'server', 'snapshot.json'), 'utf-8')
  } catch (err) {
    throw new Error(`Snapshot file unreadable: ${(err as NodeJS.ErrnoException).code ?? 'UNKNOWN'}`)
  }
  let employments: RemoteEmployment[]
  try {
    employments = JSON.parse(raw) as RemoteEmployment[]
  } catch {
    throw new Error('Snapshot file contains invalid JSON')
  }
  const people = employments.filter(isActive).map(mapEmployment).filter((p) => p.name != null || p.title != null || p.department != null)
  return {
    forest: buildForest(people),
    source: 'snapshot',
    fetchedAt: new Date().toISOString(),
  }
}

function countNodes(node: { children?: unknown[] }): number {
  return 1 + (node.children ?? []).reduce((acc: number, c) => acc + countNodes(c as { children?: unknown[] }), 0)
}

/** Live data path: Remote API → active-only filter → forest. Can take tens of seconds for large orgs (N+1 detail fetch). */
async function fetchLive(token: string): Promise<OrgResponse> {
  const t0 = Date.now()
  console.log('[org] starting live fetch')
  const { employments, skipped } = await fetchAllEmployments(token)
  const active = employments.filter(isActive)
  console.log(`[org] status filter — ${active.length}/${employments.length} active (${employments.length - active.length} archived/pre-hire excluded)`)
  const people = active.map(mapEmployment).filter((p) => p.name != null || p.title != null || p.department != null)
  const forest = buildForest(people)
  const totalNodes = forest.reduce((acc, root) => acc + countNodes(root), 0)
  console.log(`[org] done — ${people.length} people, ${forest.length} root(s), ${totalNodes} total nodes, ${skipped} skipped, ${Date.now() - t0}ms`)
  return {
    forest,
    source: 'live',
    fetchedAt: new Date().toISOString(),
    skippedCount: skipped > 0 ? skipped : undefined,
  }
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/org/refresh', (_req, res) => {
  cache = null
  cacheTime = 0
  res.json({ ok: true })
})

// Main data route. Note the try/catch around every await — Express 4 does
// not route async rejections to the error middleware (see file header).
app.get('/api/org', async (_req, res) => {
  // Serve cache if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL_MS) {
    return res.json(cache)
  }

  const token = process.env.REMOTE_API_TOKEN
  if (!token) {
    try {
      return res.json(loadSnapshot())
    } catch (err) {
      console.error('[org] snapshot load failed:', err)
      return res.status(503).json({ error: 'No API token and snapshot unavailable' })
    }
  }

  try {
    const live = await fetchLive(token)
    cache = live
    cacheTime = Date.now()
    return res.json(live)
  } catch (err) {
    console.error('[org] live fetch failed, falling back to snapshot:', err)
    try {
      return res.json(loadSnapshot())
    } catch (snapErr) {
      console.error('[org] snapshot fallback also failed:', snapErr)
      return res.status(503).json({ error: 'Org data unavailable' })
    }
  }
})

// Serve built SPA in production. ORDER MATTERS: this catch-all must stay
// after the /api routes or it would swallow them and serve index.html.
const distPath = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).end()
  })
})

// Express error middleware — catches synchronous throws from route handlers
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
