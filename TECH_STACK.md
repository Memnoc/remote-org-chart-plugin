# Tech Stack & Deployment

## Runtime Languages

| Layer | Language |
|-------|----------|
| Frontend | TypeScript 5.5 + React 18 |
| Backend | TypeScript 5.5 + Node.js (ESM) |
| Shared types | TypeScript — single `shared/types.ts` consumed by both |

---

## Frontend

### Core
- **React 18** — UI rendering, hooks-based state
- **Vite 5** — dev server, HMR, production bundler (outputs to `dist/`)
- **TypeScript** — strict mode, compiled by Vite for the frontend, `tsc` separately for the server

### Libraries
- **react-d3-tree 3.6** — SVG-based org tree renderer. Custom node rendering via `renderCustomNodeElement` (foreignObject wrapping React components). No imperative expand/collapse API — expand/collapse all is achieved by remounting trees via React `key` change with `initialDepth`.

### Styling
- **Inline styles only** — no CSS framework, no CSS Modules. Design tokens via CSS custom properties (`var(--primary)`, `var(--bg)`, etc.)
- **Theming** — light/dark via `data-theme` attribute on `<html>`; all colours defined as CSS variables in `index.css`
- **No external icon library** — all icons are inline SVGs

### State
- `useState` / `useMemo` / `useEffect` — no global state library
- URL query params as persistent state (`history.replaceState`) for search, filters, view mode

---

## Backend

### Core
- **Express 4** — single-file server (`server/index.ts`)
- **Node built-ins only** — `fs.readFileSync` for snapshot, native `fetch` for Remote API calls (Node 18+)
- **ESM** — `"type": "module"` in `package.json`, compiled with `moduleResolution: NodeNext`

### API Integration
- **Remote API base URL:** `https://gateway.remote-sandbox.com/v1`
- **Auth:** Bearer token via `REMOTE_API_TOKEN` env var
- **Pagination:** `GET /v1/employments?page=N&page_size=100` iterated until `total_pages` exhausted — collects all employment IDs
- **Detail fetch:** `GET /v1/employments/{id}` per employee — fields used: `full_name`, `job_title`, `department`, `manager_employment_id`, `status`
- **Concurrency:** individual detail fetches run in batches of 8 (`Promise.allSettled`) — individual failures are silently skipped, rest of org still renders
- **Fallback:** if token absent or live fetch throws → loads `server/snapshot.json` (seed dataset: 11 raw entries; one all-null entry is dropped by the mapper guard, 10 people render)

### Caching
- In-memory cache: single `cache` variable + `cacheTime` timestamp
- TTL: 5 minutes (`CACHE_TTL_MS = 5 * 60 * 1000`)
- Cache bust: `POST /api/org/refresh` sets `cache = null` — client calls this before re-fetching

### Tree Construction (`server/lib/treeBuilder.ts`)
1. Build `childrenMap: Map<employmentId, Person[]>` from flat list
2. **Cycle detection:** walk each node's manager chain; if a node is visited twice, mark `cycleFlag = true` — cycle-flagged nodes become roots instead of children, breaking the cycle
3. **Roots:** nodes with `managerId === null`, dangling manager references, cycle-flagged nodes, or external-manager nodes
4. **External managers:** employees whose manager is not in the Remote system get `isExternal: true` and render as root nodes with a "Contractor" badge

---

## Server Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{ status: 'ok' }` — used by Render health check |
| `GET` | `/api/org` | Returns org forest (cached, live or snapshot) |
| `POST` | `/api/org/refresh` | Clears cache, returns `{ ok: true }` |
| `GET` | `*` | Serves compiled SPA (`dist/index.html`) — catch-all for client-side routing |

---

## Build Process

```
npm run build
```

Two parallel compilations:

1. **Vite** — bundles React SPA → `dist/` (HTML + hashed JS/CSS assets)
2. **tsc** with `tsconfig.server.json` — compiles Express server → `dist-server/` (ESM JS, no bundling)

```
npm start
```

Runs `node dist-server/server/index.js` — Express serves both the API and the static SPA from `dist/`.

### Dev Mode

```
npm run dev
```

Runs concurrently:
- `vite` — frontend dev server on port 5173, with proxy: `{ '/api': 'http://localhost:3001' }`
- `tsx watch server/index.ts` — backend with file-watch restart on port 3001

The Vite proxy means the frontend calls `/api/org` and Vite forwards it to Express — same code path in dev and production, no CORS configuration needed.

---

## Deployment (Render.com)

**Service type:** Web Service (single instance)

**Configuration file:** `render.yaml` at repo root

```yaml
services:
  - type: web
    name: remote-org-chart
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: REMOTE_API_TOKEN
        sync: false   # set manually in Render dashboard
      - key: PORT
        value: "3001"
```

**Deploy trigger:** push to `main` → Render auto-deploys (no CI/CD pipeline configured separately).

**Health check:** `GET /health` configured in Render dashboard → Render restarts the service automatically if the endpoint stops responding.

**Environment variables:**
- `REMOTE_API_TOKEN` — set manually in Render dashboard (not in `render.yaml` to avoid committing secrets). When absent, app runs on snapshot data.
- `PORT` — set to `3001` by `render.yaml`; Express binds to `process.env.PORT ?? 3001`.

**Single-origin deployment:** Express serves both the API (`/api/*`) and the compiled SPA (`dist/`). No separate static hosting, no CDN, no CORS. The SPA is served from the same origin as the API.

---

## Linting

**ESLint** (flat config, `eslint.config.js`) with `typescript-eslint` and **`eslint-plugin-react-hooks`** — rules-of-hooks and `exhaustive-deps` (as errors) guard effect dependency correctness per [react.dev/learn/escape-hatches](https://react.dev/learn/escape-hatches).

```
npm run lint
```

---

## Testing

**Framework:** Vitest 2

```
npm test        # run once
npm run test:watch  # watch mode
```

Test files located in `tests/`. Configuration in `vitest.config.ts`.

---

## Documentation Site

**Framework:** Docusaurus 3 (classic preset, TypeScript) in `website/` — its own `package.json` and lockfile, isolated from the app's dependencies.

**Hosting:** GitHub Pages at `https://memnoc.github.io/remote-org-chart-plugin/`, decoupled from the Render app (see [DECISIONS.md](./DECISIONS.md)).

**Deploy:** GitHub Actions (`.github/workflows/deploy-docs.yml`) — builds `website/` and publishes to Pages on every push to `main` touching `website/**`. Independent of the Render app deploy.

**Config:** `baseUrl: /remote-org-chart-plugin/` (Pages project sub-path); `url: https://memnoc.github.io`. Navbar "Open App" and footer link back to the Render app via absolute URLs.

**Scripts (root `package.json`):**
```
npm run docs:dev     # Docusaurus dev server, hot reload
npm run docs:build   # install + production build → website/build/
```
