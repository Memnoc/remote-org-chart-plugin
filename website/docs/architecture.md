---
sidebar_position: 4
title: Architecture
---

# Architecture

A single Node process in production. Express serves the compiled SPA **and** the `/api`
routes from the same origin — no CORS, no separate static host.

```
Browser ── Vite/React SPA
   │  GET /api/org
   ▼
Express proxy (holds API token server-side)
   ├─ live path: Remote REST API → build forest → cache (5 min TTL)
   └─ fallback:  snapshot.json (committed, always works)
```

## Request flow

1. Frontend calls `GET /api/org`.
2. Server checks the in-memory cache (5-minute TTL). Fresh cache is returned as-is.
3. If `REMOTE_API_TOKEN` is present → fetch live data from the Remote API, paginate all
   pages, fetch per-employee detail with bounded concurrency, **filter to
   `status === 'active'`** (archived and pre-hire employments don't belong on an org
   chart), map to the internal `OrgNode` shape, and build the reporting forest.
4. If the token is absent **or** the live fetch throws → fall back to `server/snapshot.json`.
5. Response envelope:
   `{ forest: OrgNode[], source: 'live' | 'snapshot', fetchedAt: string, skippedCount?: number }`

See [Remote API integration](./api-integration.md) for the fetch details and
[Edge cases](./edge-cases.md) for how the forest handles irregular data.

## Building the forest

`buildForest()` constructs an array of trees from the flat employee list using
`manager_employment_id`:

1. Build `childrenMap: Map<employmentId, Person[]>` from the flat list.
2. **Cycle detection** — walk each node's manager chain; if a node is seen twice, flag it.
   Cycle-flagged nodes become roots instead of children, breaking the cycle.
3. **Roots** — nodes with `managerId === null`, dangling manager references, cycle-flagged
   nodes, or external-manager nodes.
4. **External managers** — employees whose manager is not on Remote get `isExternal: true`
   and render as root nodes with a badge.

The forest stays multi-root in the data (9 genuine roots in the sandbox org). The **tree
view** joins those roots under one synthetic "Org" node at render time (`joinForest()`),
so the canvas shows a single expandable tree without hiding anyone. List view, stats, and
CSV export consume the honest forest directly.

The snapshot doubles as the tree-builder's test fixture: it embeds every edge case, so the
Vitest suite exercises real irregular shapes rather than synthetic ones.

## Server routes

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | `{ status: 'ok' }` — Render health check |
| `GET`  | `/api/org` | Org forest (cached, live or snapshot) |
| `POST` | `/api/org/refresh` | Clears the cache, returns `{ ok: true }` |
| `GET`  | `*` | Compiled SPA (`dist/index.html`) — client-side routing catch-all |

:::info Ordering matters
The `/api` routes are registered **before** the `*` SPA catch-all, or the catch-all would
swallow them and serve the app shell instead.
:::

These docs are hosted separately on GitHub Pages — see [Deployment](./deployment.md#docs-hosting).

## Project structure

```
/server         Express proxy, Remote API client, tree-builder, snapshot.json
/src            React SPA — App, TreeView, ListView, NodeCard, useOrg hook
/shared         Shared TypeScript types — the HTTP contract only (OrgNode, OrgResponse)
/website        This Docusaurus docs site
/tests          Vitest unit tests — the pure core (tree-builder, mapper, filter, nav, stats, CSV)
render.yaml     Render deploy config
```
