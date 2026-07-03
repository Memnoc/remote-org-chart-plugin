import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import type { OrgResponse } from '../shared/types.js'
import type { RemoteEmployment } from './lib/types.js'
import { fetchAllEmployments } from './lib/remoteClient.js'
import { mapEmployment } from './lib/mapper.js'
import { buildForest } from './lib/treeBuilder.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT ?? 3001

// In-memory cache
let cache: OrgResponse | null = null
let cacheTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min

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
  const people = employments.map(mapEmployment).filter((p) => p.name != null || p.title != null || p.department != null)
  return {
    forest: buildForest(people),
    source: 'snapshot',
    fetchedAt: new Date().toISOString(),
  }
}

function countNodes(node: { children?: unknown[] }): number {
  return 1 + (node.children ?? []).reduce((acc: number, c) => acc + countNodes(c as { children?: unknown[] }), 0)
}

async function fetchLive(token: string): Promise<OrgResponse> {
  const t0 = Date.now()
  console.log('[org] starting live fetch')
  const employments = await fetchAllEmployments(token)
  const people = employments.map(mapEmployment).filter((p) => p.name != null || p.title != null || p.department != null)
  const forest = buildForest(people)
  const totalNodes = forest.reduce((acc, root) => acc + countNodes(root), 0)
  console.log(`[org] done — ${people.length} people, ${forest.length} root(s), ${totalNodes} total nodes, ${Date.now() - t0}ms`)
  return {
    forest,
    source: 'live',
    fetchedAt: new Date().toISOString(),
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

// Serve built SPA in production
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
