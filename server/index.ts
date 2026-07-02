import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import type { OrgResponse, RemoteEmployment } from '../shared/types.js'
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
  const raw = readFileSync(path.join(__dirname, '..', '..', 'server', 'snapshot.json'), 'utf-8')
  const employments = JSON.parse(raw) as RemoteEmployment[]
  const people = employments.map(mapEmployment).filter((p) => p.name !== '—' || p.title !== '—' || p.department !== '—')
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
  const people = employments.map(mapEmployment).filter((p) => p.name !== '—' || p.title !== '—' || p.department !== '—')
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
    const snap = loadSnapshot()
    return res.json(snap)
  }

  try {
    const live = await fetchLive(token)
    cache = live
    cacheTime = Date.now()
    return res.json(live)
  } catch (err) {
    console.error('Live fetch failed, falling back to snapshot:', err)
    const snap = loadSnapshot()
    return res.json(snap)
  }
})

// Serve built SPA in production
const distPath = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
