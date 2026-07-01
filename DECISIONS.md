# Design Decisions & Trade-offs

---

## Single-Service Deployment (Backend Serves the SPA)

**Decision:** Express serves both the API and the compiled Vite SPA from the same process and origin.

**Why:** Eliminates CORS entirely — the SPA and API share the same origin, so no `Access-Control-Allow-Origin` headers, no preflight requests, no credentials complexity. One Render service to configure, monitor, and pay for instead of two. Simpler `render.yaml`.

**Trade-off:** The server is doing double duty. Under high traffic, a CPU-bound API request could delay static asset serving. For a production system at scale you'd put static assets behind a CDN (Cloudflare, S3 + CloudFront) and keep the API separate. At this scale the simplicity wins.

---

## In-Memory Cache Over a Persistent Store

**Decision:** Org data is cached in a module-level variable (`let cache`) with a 5-minute TTL. No Redis, no database.

**Why:** The Remote API rate limits are unknown and detail fetches are per-employee (N+1 pattern by necessity — the list endpoint doesn't return manager data). Caching avoids hammering the API on every page load. An in-memory variable is zero-dependency and sufficient for a single-instance deployment.

**Trade-off:** Cache is per-process. If Render restarts the server or if you scale to multiple instances, each instance has its own cache and may serve different data briefly. A Redis cache would solve this but adds operational complexity. For a single-instance internal tool, this is acceptable.

---

## Remote API: Paginated List Then Per-Employee Detail Fetches

**Decision:** Two-phase fetch — first paginate through `GET /v1/employments` to collect all IDs, then fetch `GET /v1/employments/{id}` per employee in batches of 8.

**Why:** The list endpoint does not return `manager_employment_id`, which is required to build the reporting tree. The detail endpoint does. There is no bulk-detail endpoint in the Remote API.

**Trade-off:** For a 200-person org this is ~25 detail requests (batched). For a 1000-person org it's ~125 batches. Latency scales linearly with org size. The pool size of 8 is a balance between throughput and not triggering rate limits. Individual failures are silently skipped (`Promise.allSettled`) so a single bad employee record doesn't crash the whole fetch.

---

## Forest Instead of Single Root

**Decision:** The data model is a `forest` (array of trees) rather than a single root node.

**Why:** Real org structures are not always a single hierarchy. The Remote API may return employees with no manager (orphans), employees whose manager is not on Remote (external managers), or employees caught in a reporting cycle (cycle-broken roots). Forcing a single artificial root ("Company") would misrepresent the data. A forest handles all these cases honestly.

**Trade-off:** The UI must handle rendering multiple trees. The tree view renders each root as a separate `SingleTree` component. The list view flattens the forest in order. Slightly more complex than a single-root assumption but more correct.

---

## Cycle Detection at Build Time, Not Render Time

**Decision:** `buildForest()` detects reporting cycles server-side before the data reaches the client. Cycle-flagged employees are promoted to root nodes, breaking the cycle.

**Why:** react-d3-tree has no cycle protection — passing a circular structure to it would cause an infinite render loop and crash the page. Detecting cycles at the data layer (server) keeps the client simple and ensures the tree is always a valid DAG before rendering.

**Trade-off:** Cycle-flagged employees appear as disconnected roots rather than in their actual position. This is a data quality issue (cycles shouldn't exist in a real org) and the badge `"cycle detected"` signals it. The alternative — silently hiding them — would lose employees from the chart entirely.

---

## Snapshot Fallback Instead of Error State

**Decision:** When `REMOTE_API_TOKEN` is absent or the live fetch fails, the server returns static seed data (`server/snapshot.json`) rather than an error.

**Why:** The app is useful and demonstrable without a live token. The fallback makes development and demoing possible. The data source indicator (orange dot = snapshot, green dot = live) communicates the state clearly without blocking the UI.

**Trade-off:** A user could mistake snapshot data for live data if they miss the indicator. The design mitigates this: the indicator is always visible in the top bar and labelled "Snapshot (fallback)" explicitly.

---

## react-d3-tree Over Custom D3

**Decision:** Used the `react-d3-tree` library rather than building a custom D3 tree layout.

**Why:** D3's tree layout (`d3.tree()`) requires manual DOM management that conflicts with React's virtual DOM. react-d3-tree handles the SVG layout, zoom, pan, and node positioning. It supports `renderCustomNodeElement` which lets us render full React components as nodes — the best of both.

**Trade-off:** react-d3-tree has no imperative API for expand/collapse. Calling "expand all" or "collapse all" cannot be done by calling a method on the tree instance. The workaround: changing React's `key` prop forces a full remount with a new `initialDepth`, which achieves the same effect. It's a controlled remount, not a bug, but it does reset zoom/pan state.

---

## Expand/Collapse All via Key Remount

**Decision:** "Expand all" / "Collapse all" buttons increment a `treeKey` counter, which is part of the React `key` on each `SingleTree`. React unmounts and remounts the tree with the new `initialDepth`.

**Why:** react-d3-tree manages its own internal collapsed state per node. There is no `expandAll()` or `collapseAll()` method exposed. The only way to reset this internal state is to unmount and remount the component with a different `initialDepth`. A React `key` change is the standard, idiomatic way to force a remount.

**Trade-off:** Remounting resets zoom level and pan position. The user loses their current viewport position when clicking expand/collapse all. This is a known limitation of the library's architecture.

---

## Inline Styles Over a CSS Framework

**Decision:** All component styles are written as inline React style objects. No Tailwind, no CSS Modules, no styled-components.

**Why:** For a self-contained assignment project, inline styles eliminate build configuration, class name collisions, and external dependencies. They co-locate styles with components, making each component fully portable. CSS custom properties (`var(--primary)`, etc.) provide theming without a framework.

**Trade-off:** Verbose — style objects are long. No hover/focus pseudo-classes in inline styles (those are handled via `onMouseEnter`/`onMouseLeave` where needed, or just omitted for simplicity). At larger scale a utility framework or CSS Modules would be more maintainable.

---

## No Global State Library

**Decision:** State is managed entirely with `useState`, `useMemo`, and `useEffect`. No Redux, Zustand, or Context API for app state.

**Why:** The app has two main pieces of shared state: the fetched org data (in `useOrg`) and the filter/search/view state (in `App`). Both are in a single component tree with straightforward prop drilling one level deep. There is no cross-cutting state that would justify a global store.

**Trade-off:** As the component tree grows, prop drilling becomes cumbersome. If a detail panel needed to trigger a dept filter change, for example, you'd need to lift state further or introduce Context. At current scope, plain hooks are the right call (YAGNI).

---

## URL State via `history.replaceState` Without a Router

**Decision:** Search query, active dept filters, and view mode are encoded in URL query params using `window.history.replaceState`. No React Router.

**Why:** The app is a single page — there are no navigable routes. Adding React Router for one URL would be over-engineering. `replaceState` updates the URL without a page reload, without adding browser history entries, and without any dependency.

**Trade-off:** Browser back/forward buttons do not restore previous filter states (because `replaceState` not `pushState`). Using `pushState` would clutter browser history with every keypress in the search box. The current approach (replace) is intentional — it treats the URL as a shareable snapshot, not navigation history.

---

## Client-Side CSV Export

**Decision:** CSV generation and download happen entirely in the browser (`Blob` + `URL.createObjectURL`). No server endpoint.

**Why:** The data is already in the client's memory (the org forest). Sending it to the server to get a CSV back would be a pointless round-trip. Browser-side `Blob` download is supported in all modern browsers and requires zero server changes.

**Trade-off:** For very large orgs, generating the CSV string in the main thread could block the UI briefly. A `Worker` could fix this, but at the scale of a typical org chart (hundreds, not millions of rows) it's imperceptible.

---

## Error Boundary at the Application Root

**Decision:** A single React Error Boundary wraps `<App />` at the root in `main.tsx`.

**Why:** Catches any render-phase error from any component in the tree and shows a recovery UI instead of a blank screen. A single root boundary is the right default — component-level boundaries only make sense when you want to isolate a specific sub-tree and allow the rest of the app to keep working.

**Trade-off:** The boundary only catches render-phase errors (thrown during `render`, `useEffect` cleanup, etc.). It does not catch async errors (rejected promises in event handlers). Those are handled separately (the `useOrg` hook catches fetch errors and surfaces them as `state.status === 'error'`).

---

## Pagination Over Virtualisation for List View

**Decision:** List view paginates at 20 rows per page rather than using a virtual list (e.g. `react-window`).

**Why:** Virtualisation is complex to implement correctly with variable row heights and tree indentation. Pagination is simple, requires no dependencies, and is immediately understandable. For the scale of a typical org chart, 20 rows per page is sufficient.

**Trade-off:** Pagination breaks the ability to `Cmd+F` search within the rendered list (only current page is in the DOM). Virtualisation would keep all rows addressable in principle. If the org grows to thousands of employees and performance becomes an issue, virtualisation would be the right replacement.

---

## Shared TypeScript Types Between Frontend and Backend

**Decision:** `shared/types.ts` is imported by both `server/` and `src/` (frontend). A single source of truth for `RemoteEmployment`, `Person`, `OrgNode`, and `OrgResponse`.

**Why:** Eliminates drift between what the server sends and what the client expects. If the API response shape changes, TypeScript compilation catches mismatches in both layers simultaneously.

**Trade-off:** The `shared/` directory is compiled twice — once by Vite (bundled into the frontend) and once by `tsc` with `tsconfig.server.json` (output to `dist-server/`). This is a minor build complexity but the type safety is worth it.
