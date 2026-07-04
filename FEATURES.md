# Org Chart Plugin — Feature Reference

Live deployment: https://remote-org-chart-plugin.onrender.com

---

## Architecture

**Stack:** Vite + React + TypeScript (frontend), Express (backend proxy), deployed on Render.com as a single service.

The Express server serves both the compiled SPA (`/dist`) and the `/api/org` endpoint. Frontend and backend share the same origin in production — no CORS required.

**Data flow:**
1. Frontend calls `GET /api/org`
2. Server checks in-memory cache (5-minute TTL)
3. If `REMOTE_API_TOKEN` is present → fetches live data from Remote API (`/v1/employments`), paginates all pages with bounded concurrency (pool size 8), filters to `status === 'active'` (archived/pre-hire employments are excluded), maps to internal `OrgNode` shape, builds reporting tree
4. If token absent or live fetch fails → falls back to `server/snapshot.json`
5. Response envelope: `{ forest: OrgNode[], source: 'live' | 'snapshot', fetchedAt: string }`

**Tree building:** `buildForest()` constructs a forest (array of trees) from the flat employee list using `manager_employment_id`. Cycles are detected and broken. Employees with no on-Remote manager become roots. External managers (off-Remote) are stub nodes with `isExternal: true`.

---

## UI Layout

The app is a single full-viewport screen (`height: 100vh`, no page scroll):

```
┌─────────────────────────────────────┐
│ Header (52px) — logo, status, theme │
├─────────────────────────────────────┤
│ Toolbar — search, filter, view, CSV │
├─────────────────────────────────────┤
│                                     │
│   Canvas (flex: 1, dot-grid bg)     │
│   [Org badge]        [Expand/Coll.] │
│                                     │
│         Tree / List content         │
│                                     │
│   [Zoom controls]                   │
└─────────────────────────────────────┘
```

All overlays (org badge, zoom bar, back button) are absolutely positioned within the canvas container so they never push content.

---

## Node Cards

Each person is rendered as a white card (`NodeCard`) with:

- **Department label** — small-caps, coloured by department (deterministic hash)
- **Avatar** — circular initials badge, tinted to match department colour
- **Name** — bold; shown as "Unknown Employee" when data is missing
- **Job title** — secondary text, clamped to two lines; full text on hover
- **Edge-case badge** — amber warning chip on people the tree builder flagged: "External manager" (short label; hover shows the full `reports to X (external)` string) or "cycle detected". The full badge text also appears in the detail panel. Live data currently has no flagged people, so this surfaces only with the snapshot dataset.
- **Direct reports pill** — shows count + chevron; clicking it expands/collapses that subtree. Only appears on manager nodes.
- **"View team →" button** — appears alongside the direct reports pill on manager nodes. Clicking it activates **Subtree Focus** mode (see below).

Department colours: Engineering = green, Sales = emerald, Executive = amber, Ops = red, Finance = pink, HR = green, Marketing = blue, Design = cyan, Legal = violet, Product = orange, External/Unassigned = slate. Unknown departments get a stable hash-derived colour.

### Selection state

Clicking the card body (not the pill or "View team") selects the node:
- Blue border + blue glow ring
- Opens the **Person Detail Panel**
- Activates **Reporting Chain Highlight** for that person

---

## Tree View

Org data is rendered as an interactive hierarchy using `react-d3-tree`.

- Vertical orientation, Bézier S-curve connectors (path goes from card bottom to card top, midpoint computed from vertical centre between nodes)
- **Line style toggle** (top-right, "Curved" / "Elbow"): switches connectors between the default S-curves and rounded orthogonal elbows. Elbow links from one parent share the same trunk and horizontal rail, so they merge into a single bus with drops — sibling lines cannot cross in this style (see the known limitation below, which applies to Curved only)
- Canvas background: dot-grid pattern (`radial-gradient`, CSS custom properties)
- **Single expandable tree:** when the data has multiple roots (no-manager, external-manager, cycle-broken), they are joined under a synthetic **"Org" chip node** so the whole org renders as one tree — Remote's look, with nobody hidden. The chip collapses/expands the full org; it is not selectable and never appears in list view, stats, or CSV (render-layer only)
- Connector lines: light slate in light mode, deep purple in dark mode
- **Known visual limitation (Curved style only):** for managers with many direct reports (≥ 8–10), the Bézier curves from the parent to widely-spread children cross each other visually. This is geometric — the S-curve uses the parent's x-coordinate as its first control point, which causes curves to intersect when children span a wide horizontal range. Workarounds: switch the line style to **Elbow** (bus routing, no sibling crossings) or use **Subtree Focus** ("View team →") to narrow the canvas to a single manager's tree.

### Zoom Controls

Floating bar bottom-left of the canvas:

- **+** / **−** buttons: ±10% zoom, clamped to 25%–250%
- **% display**: shows current zoom level
- **Reset View**: returns zoom to 80%

Wired to react-d3-tree's reactive `zoom` prop — no remount needed.

### Expand / Collapse All

Buttons top-right of the canvas. Force all nodes to expand or collapse by remounting the tree with a new `initialDepth` (`undefined` = expanded; depth 1 under the virtual Org root = collapsed to top-level roots).

**The app starts collapsed** — Org chip + top-level roots only, like Remote's own chart. The tree auto-expands while search/department filters are active (matches must be visible) and when focusing a team via "View team →"; the Expand/Collapse-all buttons override explicitly.

### Reporting Chain Highlight

When a node is selected, the full reporting chain from the tree root down to that person is highlighted:

- **Chain nodes**: amber border (`#f59e0b`) + amber glow ring
- **Chain connector lines**: amber stroke, 2.5px width (vs. 1.5px default)
- **Selected node**: retains its blue selection ring — visually distinct as the destination
- Implemented via `pathClassFunc` prop on `react-d3-tree` (applies CSS class to individual SVG links) combined with `onChain` prop on `NodeCard`
- Chain recalculates on every selection change via a depth-first `findChain()` traversal

### Subtree Focus

Any manager node has a **"View team →"** button (coloured to match the node's department). Clicking it:

1. Narrows the canvas to show only that person's subtree
2. Replaces the org badge with **"[Name]'s team · N people"**
3. Shows a **"← Full org"** button top-left to return to the full chart
4. Resets selected node (clears chain highlight)
5. All features (chain highlight, zoom, expand/collapse, search, filter) continue to work within the focused subtree

Implemented by deriving `displayForest` from a `focusedId` state: `findSubtree()` traverses the full forest and returns the matching subtree as a single-element forest.

---

## List View

Flat list of all employees in depth-first tree order.

- Indentation via `└─` prefix + left padding to convey hierarchy
- Shows name, title, department per row
- Matched search substrings highlighted (yellow background)
- Paginated at 20 rows per page; page resets when search/filter changes

---

## Search

- Filters across **name**, **job title**, and **department** simultaneously
- Applied before department filter: search → dept filter → render
- Tree view: non-matching branches pruned; parent nodes leading to matches are preserved
- **Context dimming:** ancestors kept only to preserve a match's reporting chain (not matches themselves) render at reduced opacity in both tree and list — matches pop, the chain stays navigable. Selecting or chain-highlighting a dimmed card restores full opacity.
- **`/`** focuses search from anywhere on the page; **`Esc`** clears and blurs

---

## Department Filter

**Filter** button in the toolbar opens a dropdown panel:

- Per-department checkboxes with employee count
- Checkbox colour matches department colour (`accentColor` CSS)
- Active row gets a tinted background
- Multiple departments selectable (OR logic within dept, AND with search)
- **Reset** clears all selections; **Apply filters** closes the panel
- Filter button shows active state (blue border/background) and a badge with the count of active filters
- Click outside or `Esc` closes the panel

---

## Org Stats Panel

**Stats** button in the toolbar (turns amber when open) opens a slide-in panel from the right:

### Metrics
| Metric | Description |
|--------|-------------|
| Total employees | Headcount across the full org |
| Managers | Nodes with at least one direct report |
| Avg span of control | Mean direct reports per manager |
| Deepest chain | Maximum reporting depth (longest root-to-leaf path) |

### Department breakdown
Horizontal bar chart showing headcount per department, sorted descending. Bars use department colours at 50% opacity (pastel). Track background is `--border-subtle`.

### Palette
Metric cards use Rosé Pine pastel accents — rose `#ebbcba`, foam `#9ccfd8`, gold `#f6c177`, iris `#c4a7e7` — with a matching tinted background and border. No primary/bright colours.

---

## Person Detail Panel

Clicking a node card opens a slide-in drawer from the right:

- Avatar initials, full name, job title, department, employment type
- **Manager** — the person's tree parent (avatar, name, title), so the reporting line is readable even when connector lines cross on the canvas. Absent for roots (no on-Remote manager); external managers appear via the badge row instead.
- **Direct reports (N)** — overlapping avatar cluster of the person's tree children (up to 6, then a "+N" chip); hover an avatar for the name. Absent for non-managers.
- Badge row (external manager / cycle) with the full badge text
- Close via `×` button, backdrop click, or `Esc`

---

## Theme

Three-way picker (icon button in header → dropdown):

| Option | Behaviour |
|--------|-----------|
| Light | Forces light theme |
| Dark | Forces dark theme |
| System | Tracks `prefers-color-scheme` media query reactively |

- Selection persisted to `localStorage` — survives page reload
- Implemented via `data-theme` attribute on `<html>` + CSS custom properties
- All colours adapt: backgrounds, borders, shadows, dot-grid, connector lines, card surfaces

---

## Shareable URL State

Search, active department filters, and view mode are kept in sync with query params via `history.replaceState`:

| Param | Example | Description |
|-------|---------|-------------|
| `?q=` | `?q=alice` | Current search string |
| `?depts=` | `?depts=Engineering,Sales` | Comma-separated active dept filters |
| `?view=` | `?view=list` | Active view (`tree` omitted as default) |

---

## Export to CSV

Client-side download of `org-chart.csv`. Columns: `Name, Title, Department, Manager, External`. Walks the full unfiltered forest in depth-first order. CSV-escaped. No server round-trip.

---

## Data Source Indicator

Header shows:

- **Green dot "Live"** — fetching from Remote API
- **Amber dot "Snapshot"** — running on seed data (no token configured)
- Timestamp of last fetch
- **Refresh** icon button: busts server cache (`POST /api/org/refresh`), then refetches

---

## React Error Boundary

Wraps `<App />` in `main.tsx`. Catches render-phase errors, shows an error card with a **Retry** button instead of a blank screen.

---

## Health Check

`GET /health` → `{ "status": "ok" }` with HTTP 200. Configured as Render's health check path for automatic service restart on failure.

---

## Documentation Site

A **Docusaurus** documentation site lives in `website/`, hosted on **GitHub Pages** at https://memnoc.github.io/remote-org-chart-plugin/ (decoupled from the Render app — see [DECISIONS.md](./DECISIONS.md)).

- Pages: Overview, Getting started (five-minute tour: what/how/why), Features, Architecture, Remote API integration, Edge cases, Tech stack, Deployment, Design decisions — sourced from the root `.md` files, with a curated grouped sidebar.
- Landing hero with feature cards linking into the docs; "Open App" and "GitHub" in the navbar.
- Deployed by a GitHub Actions workflow (`.github/workflows/deploy-docs.yml`) on every push to `main` that touches `website/**`.
- The app **Header** has a **Docs** link that opens the site in a new tab.
- Local preview: `npm run docs:dev` (hot reload) or `npm run docs:build && npm --prefix website run serve` (exact Pages build).
