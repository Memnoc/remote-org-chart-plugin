# Remote Org Chart Plugin — Feature Reference

Live deployment: https://remote-org-chart-plugin.onrender.com

---

## Architecture

**Stack:** Vite + React + TypeScript (frontend), Express (backend proxy), deployed on Render.com as a single service.

The Express server serves both the compiled SPA (`/dist`) and the `/api/org` endpoint. In production the frontend and backend share the same origin — no CORS required.

**Data flow:**
1. Frontend calls `GET /api/org`
2. Server checks in-memory cache (5-minute TTL)
3. If `REMOTE_API_TOKEN` env var is present → fetches live data from Remote API (`/v1/employments`), paginates through all pages, maps to internal `Person` shape, builds a reporting tree
4. If token is absent or live fetch fails → falls back to `server/snapshot.json` (static seed data)
5. Response envelope: `{ forest: OrgNode[], source: 'live' | 'snapshot', fetchedAt: string }`

**Tree building:** `buildForest()` constructs a forest (array of trees) from the flat employee list using `manager_employment_id` as the parent reference. Cycles are detected and flagged. Employees with no on-Remote manager become roots. External managers (off-Remote) are represented as stub nodes with `isExternal: true`.

---

## Data Source Indicator

The top bar shows a live status indicator:

- **Orange dot — "Snapshot (fallback)"**: app is running on seed data because no `REMOTE_API_TOKEN` is configured
- **Green dot — "Live — Remote API"**: app is fetching real data from the Remote API
- Timestamp shows when the data was last fetched

---

## Tree View

Org data is visualised as an interactive hierarchy using `react-d3-tree`.

- Vertical orientation, step-style connectors
- Each node rendered as a custom card (`NodeCard`) with: avatar initials, name, job title, department pill, contractor badge if external
- Department colour is derived deterministically from the department name (consistent across views)
- Nodes with direct reports show a chevron; clicking it toggles expand/collapse for that subtree
- Clicking the card body (not the chevron) opens the **Person Detail Panel**
- Multiple root nodes (disconnected trees) each render as a separate tree section

### Expand / Collapse All

Buttons above the tree force all nodes to expand or collapse simultaneously. Implemented by incrementing a React key to remount the tree with the target `initialDepth` (`undefined` = fully expanded, `0` = collapsed to root only).

---

## List View

Flat list rendering of the same data in tree indentation order.

- Indentation depth conveyed visually with `└─` prefix and left padding
- Shows name, job title, department inline per row
- Paginated at 20 rows per page with Previous / Next controls
- Page resets to 1 when search or filters change

---

## Search

- Search box in the toolbar filters across **name**, **job title**, and **department** simultaneously
- Filter is applied before department filters (search → dept filter → render)
- In **List view**: matched substring is highlighted in each matching field (yellow/primary background, white text)
- In **Tree view**: non-matching branches are pruned, but parent nodes that lead to a match are preserved
- **Keyboard shortcut:** press `/` anywhere on the page (when not already in an input) to focus the search box; press `Esc` to clear and blur

---

## Department Filter (Stats Bar)

A stats bar below the toolbar shows:

- Total employee count
- Per-department pills, sorted by headcount descending

Pills are interactive:

- Click a pill to activate that department filter
- Multiple departments can be active simultaneously (OR logic within dept, AND with search)
- Active pill: solid colour fill, white text
- Inactive pills with an active filter: dimmed to 35% opacity
- When a search is active: pills show `filtered/total` ratio (e.g. `Engineering 3/12`)
- **Clear** button appears when any filter is active; clicking it removes all dept filters

Department colours are consistent: Engineering = indigo, Sales = emerald, Executive = amber, Ops = red, Finance = sky, HR = pink, Design = teal, External/Unassigned = slate. Unknown departments get a stable hash-derived colour from the same palette.

---

## Person Detail Panel

Clicking a node card in Tree view opens a slide-in drawer from the right edge:

- Shows: avatar initials, full name, job title, department pill, employment type (Full-time / Contractor)
- Closing: click the `×` button, click the backdrop overlay, or press `Esc`
- Does not interfere with expand/collapse — the chevron and card body are separate click targets

---

## Shareable URL State

Search term, active department filters, and view mode are encoded in query parameters and kept in sync as state changes:

| Param | Example | Description |
|-------|---------|-------------|
| `?q=` | `?q=alice` | Current search string |
| `?depts=` | `?depts=Engineering,Sales` | Comma-separated active dept filters |
| `?view=` | `?view=list` | Active view (`tree` is default, omitted when active) |

Opening a URL with these params restores the exact state. Uses `history.replaceState` — no page reload, no browser history pollution.

---

## Export to CSV

"Export CSV" button in the toolbar triggers a client-side download of `org-chart.csv`.

Columns: `Name, Title, Department, Manager, External`

- Walks the full unfiltered forest in depth-first order
- Manager column contains the direct parent node's name
- External column: `Yes` for contractor nodes, `No` otherwise
- Values are CSV-escaped (double-quote wrapping, internal quotes doubled)
- No server round-trip — generated entirely in the browser via `Blob` + `URL.createObjectURL`

---

## Manual Cache Refresh

A refresh icon button in the top bar (next to the data timestamp) allows busting the server-side cache without redeploying:

1. Client calls `POST /api/org/refresh` → server sets `cache = null`
2. Client immediately re-calls `GET /api/org` → server fetches fresh data
3. Timestamp in top bar updates to reflect the new fetch time

Useful once a live `REMOTE_API_TOKEN` is connected and you need to pull updated org data without waiting for the 5-minute TTL.

---

## React Error Boundary

A class-component error boundary wraps the entire `<App />` tree in `main.tsx`.

- Catches render-phase errors from any component in the tree
- Shows a styled error card with the error message and a **Retry** button instead of a blank screen
- Retry resets the boundary state, allowing React to attempt re-rendering

---

## Health Check

`GET /health` returns `{ "status": "ok" }` with HTTP 200.

Configured as the health check path in the Render dashboard. Render pings this endpoint periodically; if it fails, Render automatically restarts the service instead of silently serving errors.

---

## Dark Mode

Toggle button (sun/moon icon) in the top bar switches between light and dark themes.

- Defaults to the OS preference (`prefers-color-scheme`)
- Implemented via `data-theme` attribute on `<html>` and CSS custom properties
- All colours, gradients, shadows, and borders adapt — no hard-coded colour values in component styles

---

## Sticky Top Bar

The top navigation bar uses `position: sticky; top: 0; z-index: 100` so it remains visible as the user scrolls down through tall org trees. Content scrolls underneath it.
