---
title: Architecture Overview
status: stable
owner: matteo-stara
updated: 2026-07-01
---

# Architecture Overview

## Overview

This document describes the high-level design of the Remote Org Chart application: how data flows from the Remote API to the browser, and why each architectural layer was chosen.

## Background

The assignment requires fetching employee data from Remote's REST API and rendering an org chart publicly accessible at a URL. The key constraints are: the API token must not be exposed to browsers, the app must render gracefully without a token, and the solution should be explainable end-to-end without framework magic.

## Details

### System diagram

```
Browser ── Vite/React SPA (react-d3-tree)
   │  GET /api/org
   ▼
Express proxy (Node.js)
   ├─ live path: Remote REST API → build tree → in-memory cache (5 min TTL)
   └─ fallback:  server/snapshot.json
```

### Components

| Component | File(s) | Responsibility |
|---|---|---|
| SPA | `src/` | Fetch `/api/org`, render tree + list views, search |
| Express proxy | `server/index.ts` | Hold API token, serve `/api/org`, cache, fallback |
| Remote client | `server/lib/remoteClient.ts` | Paginated list fetch + bounded concurrent detail fetch |
| Mapper | `server/lib/mapper.ts` | `RemoteEmployment` → `Person` (typed, safe defaults) |
| Tree-builder | `server/lib/treeBuilder.ts` | `Person[]` → `OrgNode[]` forest (edge policy, cycle detection) |
| Snapshot | `server/snapshot.json` | Committed fallback data; also test fixture |
| Shared types | `shared/types.ts` | Single source of truth for data shapes |

### Data flow

1. Browser hits `/api/org`.
2. Proxy checks in-memory cache (5 min TTL). If fresh, return cached forest.
3. If `REMOTE_API_TOKEN` is unset, serve snapshot JSON.
4. Otherwise: page through `GET /v1/employments` to collect IDs; fetch each detail concurrently (pool 8); map to `Person[]`; build forest; cache; return.
5. On any fetch error, fall back to snapshot.

## Decisions & Trade-offs

See [`docs/adr/`](./adr/) for formal records. Key choices:

- **Single process (Express serves both API and SPA):** keeps the deploy simple — one Render service, one start command. The alternative (separate API + CDN-hosted SPA) adds a second service, CORS config, and a more complex deploy for no benefit at this scale.
- **N+1 detail fetch:** required because the list endpoint does not return manager fields. Bounded concurrency and caching make this acceptable at demo scale.
- **Snapshot fallback:** removes the hard dependency on token availability. The app always renders something useful.

## Limitations & Known Issues

- Cache is in-process memory — cleared on server restart. Acceptable for a demo; production would use Redis or similar.
- N+1 fetch is O(n) on employees. At thousands of employees this would be slow. Mitigated by cache; a real system would need a webhook/sync approach.
- Snapshot data is hand-authored and may drift from actual Acme Sandbox Corp structure once a live token is available.

## References

- [Remote API integration](./api-integration.md)
- [Deployment guide](./deployment.md)
- [ADR-0001: Server-side proxy over client-side API calls](./adr/0001-server-side-proxy.md)
- [ADR-0002: REST over Remote MCP at runtime](./adr/0002-rest-over-mcp.md)
