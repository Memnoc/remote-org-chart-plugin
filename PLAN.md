# Remote Org Chart — Build Plan

## Summary

Fetch employee/org data from Remote's REST API, build a manager→report hierarchy, render an interactive org chart, deploy to a public URL. Bounded scope (~4-6h), defensive against missing data and missing credentials.

## Locked Decisions

| #   | Decision             | Choice                                                                                                |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Data-shape spike     | Deferred until sandbox token arrives; design defensively from docs meanwhile                          |
| 2   | Deployed data source | **C** — live server-side proxy **+** snapshot JSON fallback                                           |
| 3   | Stack                | Vite + React + TypeScript SPA · Express (TS) proxy · single proces/deploy · Render free tier          |
| 4   | Hierarchy build      | N+1 fetch, `manager_employment_id` edges, bounded concurrency + in-memory cache, explicit edge policy |
| 5   | Visualization        | Interactive collapsible tree (`react-d3-tree`, forest) + plain-list fallback                          |
| 6   | Remote MCP           | REST at runtime; MCP used dev-time + rationale in README (not forced into runtime)                    |
| 7   | Testing              | Targeted Vitest — tree-builder + API→model mapper only                                                |
| 8   | Sequencing           | Build now against hand-authored mock snapshot; swap real data when token lands                        |

## API Facts (from developer.remote.com)

- Auth: `Authorization: Bearer <token>`. Base `https://gateway.remote.com/api/v1/`.
- `GET /v1/employments` returns `MinimalEmployment` — `full_name`, `job_title`, `department` — **no manager field**. Paginated (`page`, `page_size` max 100).
- `GET /v1/employments/{id}` (full) adds `manager`, `manager_email`, **`manager_employment_id`** (nullable — the reporting edge).
- Reporting hierarchy therefore requires per-employment detail fetch (N+1).

## Architecture

```
Browser ── SPA (react-d3-tree forest + list fallback)
   │  GET /api/org
   ▼
Express proxy (holds token)
   ├─ live: Remote REST ── build tree ── cache (5min TTL)
   └─ fallback: snapshot.json  (token missing / API error)
```

## Data Flow (proxy)

1. `GET /v1/employments` — page through `page_size=100`.
2. Concurrent (pool ~8) `GET /v1/employments/{id}` → `manager_employment_id`, `manager`, `manager_email`, `job_title`, `department`, `full_name`.
3. Map → typed `Person` model.
4. Build forest: edge `manager_employment_id → id`; roots = null parent; detect/break cycles; external manager (`manager_email` set, id null) → root + badge.
5. Cache result; on any failure serve `snapshot.json`.

## Edge Cases (assignment grades this)

- null `manager_employment_id` → root node.
- `manager_email` set, id null → manager off-Remote → root + "reports to <email> (external)" badge.
- Cycle (A→B→A) → detect, break at revisit, flag node.
- Multiple roots → forest; render each tree stacked; no single-CEO assumption.
- Missing name/title/dept → explicit placeholder ("—" / "Unknown"), never blank.

## Frontend

Interactive collapsible tree (forest = stacked roots), per-node card (name/title/dept), search/filter, toggle to plain indented-list fallback, loading/error states, "data source: live | snapshot" indicator.

## Tests (Vitest, targeted)

Tree-builder (all edge cases; fixture = snapshot) + API→model mapper. No UI/proxy tests (manual verify).

## Repo Layout

```
/server   Express proxy, Remote client, tree-builder, snapshot.json
/src      React SPA, tree + list views, api hook
/tests    tree-builder, mapper
README.md setup · architecture · MCP-choice rationale · assumptions/limitations
```

## Build Order

1. Scaffold (Vite+TS, Express, shared types); `git init`.
2. Author mock `snapshot.json` (all edge cases baked in).
3. Tree-builder + mapper + Vitest → green.
4. Proxy route (live + fallback + cache).
5. SPA: tree + list + search + states.
6. README + Render deploy config, single-command dev.
7. Deploy to Render → public URL.
8. Standardized `/docs` + templates (architecture, api-integration, deployment); README indexes.
9. If time remains: Docusaurus wrap of `/docs` → GitHub Pages.
10. **On token arrival**: run real N+1, overwrite snapshot with Acme data, smoke-test live path, redeploy.

## Documentation (extra-mile: standardization signal)

Decision **C** — standardized markdown template first, optional Docusaurus wrap if time remains.

- `/docs/_TEMPLATE.md` — reusable doc template: frontmatter schema (title, status, owner, updated) + fixed section structure. The template artifact itself is the modularity/standardization proof.
- `/docs/adr/_TEMPLATE.md` — ADR template.
- Pages authored from the template: `architecture.md`, `api-integration.md`, `deployment.md`. README indexes `/docs`.
- Renders natively on GitHub.
- **If steps 1-7 finish under budget:** wrap same `/docs` markdown in a minimal Docusaurus site (LazyVim classic theme) → GitHub Pages. Additive, zero content rework (Docusaurus ingests the markdown). No custom domain.
- lazyvim.org is Docusaurus — confirmed.

## Deployment (Render, free tier)

- Single web service: `npm run build` (Vite → `dist/`), Express serves `dist/` static **+** `/api`.
- Auto-deploy from public GitHub repo.
- Token stored as Render secret env var; app runs on snapshot fallback if unset.
- Render subdomain URL (no custom domain).
- **Cold-start mitigation (decision A):** free tier sleeps after ~15min idle → 30-60s cold start. Document in README; add keep-alive ping (cron-job.org → `/health` every 10min) to stay warm during review. Snapshot fallback means a cold/tokenless hit still renders a full chart.

## Deferred (blocked on recruiter credentials)

Real token · live-path verification · real snapshot · MCP dev-time exploration.
