# Remote Org Chart

An org chart application built on Remote's API. Displays manager→direct-report hierarchies with interactive tree and list views.

**Live app:** https://remote-org-chart-plugin.onrender.com/
**Docs site:** https://memnoc.github.io/remote-org-chart-plugin/ (Docusaurus on GitHub Pages, source in [`/website`](./website/))

---

## Setup & Run

**Requirements:** Node.js ≥ 18

```bash
# Install dependencies
npm install

# Copy env template and set your Remote sandbox API token
cp .env.example .env
# Edit .env: set REMOTE_API_TOKEN=<your token>

# Start dev server (SPA on :5173, proxy on :3001)
npm run dev
```

Open `http://localhost:5173`.

Without `REMOTE_API_TOKEN`, the app serves snapshot data (fallback mode).

`npm install` also runs a `prepare` step that points git at `.githooks/` — enabling a
non-blocking `pre-commit` reminder to update docs when a commit changes code. No manual
setup needed.

---

## Architecture

```
Browser ── Vite/React SPA
   │  GET /api/org
   ▼
Express proxy (holds API token server-side)
   ├─ live path: Remote REST API → build tree → cache (5 min TTL)
   └─ fallback:  snapshot.json (committed, always works)
```

Single process in production: Express serves the built SPA (`dist/`) and the `/api` routes.

### Key design decisions

**Why live proxy + snapshot fallback?**
Token never reaches the browser. Reviewers always see a working chart even if the API is unreachable or the token is rotated.

**Why N+1 detail fetch?**
`GET /v1/employments` (list) returns `MinimalEmployment` with no manager fields. Manager relationships (`manager_employment_id`, `manager_email`) only appear on `GET /v1/employments/{id}` (detail). A single list endpoint would be cleaner but the data isn't there. Mitigated with bounded concurrency (pool 8) and a 5-minute in-memory cache.

**Why REST at runtime instead of Remote MCP?**
Remote MCP is designed for LLM agents — structured tool definitions for AI models to call. Using it as an app backend would add an agent runtime dependency for no benefit over direct REST calls. REST is the correct choice for a server-side data layer. MCP was used during development to explore the sandbox schema and accelerate understanding of the API surface.

**Snapshot as fallback:**
`server/snapshot.json` contains representative data (including all edge cases) and doubles as test fixture for the tree-builder.

---

## Edge Cases Handled

| Scenario | Handling |
|---|---|
| No manager (`manager_employment_id: null`) | Rendered as root node |
| External manager (`manager_email` set, no id) | Rendered as root with "reports to X (external)" badge |
| Dangling manager reference (id not in dataset) | Treated as root (orphan) |
| Reporting cycle (A → B → A) | Cycle detected; cycle nodes rendered as roots with "cycle detected" badge |
| Missing name / title / department | Displayed as `—`, never blank |
| Multiple root nodes | Joined under a virtual "Org" root — one expandable tree, no one hidden |
| Non-active employments (archived / pre-hire) | Filtered out server-side; org chart shows current staff only |

---

## Deployment

Deployed on **Render** (free tier) from this repo.

```bash
# Production build
npm run build   # Vite → dist/, tsc server → dist-server/

# Start production server
npm start
```

See [`render.yaml`](./render.yaml) for service config. Set `REMOTE_API_TOKEN` as an environment variable in the Render dashboard.

**Cold-start note:** Render free tier sleeps after ~15 min idle (30–60s cold start on first hit). A keep-alive ping is configured at [cron-job.org](https://cron-job.org) hitting `/health` every 10 min during the review window. The snapshot fallback means even a cold/tokenless hit renders a full chart.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Vite + React + TypeScript | Fast build, familiar, total comprehension |
| Visualization | react-d3-tree | Pan/zoom/collapse out of the box; handles forest layout |
| Backend | Express (TypeScript) | ~40 lines; serves SPA + proxy; single deployable process |
| Deploy | Render (free tier) | `git push` deploy, public URL, no vendor lock-in |
| Tests | Vitest | Fast, zero-config, same ESM setup as the app |

---

## Project Structure

```
/server         Express proxy, Remote API client, tree-builder, snapshot.json
/src            React SPA — App, TreeView, ListView, NodeCard, useOrg hook
/shared         Shared TypeScript types (Person, OrgNode, RemoteEmployment, OrgResponse)
/tests          Vitest unit tests — the pure core (tree-builder, mapper, filter, nav, stats, CSV)
/docs           Architecture and integration documentation
render.yaml     Render deploy config
```

---

## Docs

- [Architecture overview](./docs/architecture.md)
- [Remote API integration](./docs/api-integration.md)
- [Deployment guide](./docs/deployment.md)
