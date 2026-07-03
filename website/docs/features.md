---
sidebar_position: 2
title: Features
---

# Features

The app is a single full-viewport screen (`height: 100vh`, no page scroll):

```
┌─────────────────────────────────────┐
│ Header (52px) — logo, status, theme │
├─────────────────────────────────────┤
│ Toolbar — search, filter, view, CSV │
├─────────────────────────────────────┤
│   Canvas (flex: 1, dot-grid bg)     │
│   [Org badge]        [Expand/Coll.] │
│         Tree / List content         │
│   [Zoom controls]                   │
└─────────────────────────────────────┘
```

All overlays (org badge, zoom bar, back button) are absolutely positioned within the
canvas so they never push content.

## Tree view

Interactive hierarchy rendered with `react-d3-tree`.

- Vertical orientation, Bézier S-curve connectors.
- Dot-grid canvas background via CSS custom properties.
- **Single expandable tree** — multiple data roots are joined under a synthetic "Org"
  chip node at render time, so the whole org expands from one tree without hiding anyone.
- **Zoom controls:** floating bar, ±10% steps clamped 25%–250%, live % readout, reset to 80%.
- **Starts collapsed** — Org chip + top-level roots, like Remote's own chart. Auto-expands
  while searching/filtering or when a team is focused; Expand/Collapse-all overrides.
- **Expand / collapse all:** remounts the tree with a new `initialDepth`.

:::note Known visual limitation
For managers with many direct reports (≥ 8–10), the Bézier curves cross visually — the
S-curve uses the parent's x-coordinate as its first control point, so curves intersect
when children span a wide horizontal range. Use **Subtree Focus** to narrow the canvas.
:::

### Reporting chain highlight

Selecting a node highlights the full chain from the tree root down to that person: amber
borders and thicker amber connector strokes, with the selected node keeping its blue ring
as the destination. Implemented via `pathClassFunc` on the links plus an `onChain` prop on
`NodeCard`, recomputed on each selection by a depth-first `findChain()` traversal.

### Subtree focus

Every manager node has a **"View team →"** button that narrows the canvas to that person's
subtree, swaps the org badge for **"[Name]'s team · N people"**, and shows **"← Full org"**
to return. Derived from a `focusedId` state via `findSubtree()`. Search, filter, zoom, and
chain highlight all keep working inside the focused subtree.

## Node cards

Each person renders as a card with a department label (small-caps, colour by deterministic
hash), an initials avatar, name (falls back to "Unknown Employee"), a job title clamped
to two lines (full text on hover), a
**direct-reports pill** (count + expand/collapse chevron, managers only), and the **"View
team →"** button.

Department colours are stable per department (Engineering green, Sales emerald, Executive
amber, and so on); unknown departments get a hash-derived colour. Clicking the card body
selects the node — blue ring, opens the detail panel, activates the chain highlight.

## List view

Flat, depth-first list of all employees. Indentation via `└─` prefix conveys hierarchy;
rows show name, title, department; matched search substrings are highlighted. Paginated at
20 rows, resetting on search/filter change.

## Search & filter

- **Search** matches name, title, and department simultaneously; applied before the
  department filter. In tree view, non-matching branches are pruned but ancestors leading
  to a match are kept — rendered **dimmed** (in tree and list) so matches pop while the
  reporting chain stays navigable. `/` focuses search anywhere; `Esc` clears and blurs.
- **Department filter** dropdown: per-department checkboxes with counts (colour-matched),
  multi-select (OR within dept, AND with search), reset, active-count badge.

## Org stats panel

Slide-in panel with headline metrics — total employees, managers, average span of control,
deepest chain — plus a per-department headcount bar chart (Rosé Pine pastel accents).

## Person detail panel

Clicking a card opens a right-hand drawer: avatar, full name, title, department, employment
type. Closes via `×`, backdrop click, or `Esc`.

## Theme

Three-way picker (Light / Dark / System). System tracks `prefers-color-scheme` reactively.
Persisted to `localStorage`, applied via `data-theme` on `<html>` + CSS custom properties.

## Shareable URL state

Search, active department filters, and view mode sync to query params via
`history.replaceState` — `?q=`, `?depts=`, `?view=` — so a filtered view is linkable.

## Export to CSV

Client-side download of `org-chart.csv` (`Name, Title, Department, Manager, External`),
walking the full unfiltered forest depth-first, CSV-escaped, no server round-trip.

## Data source indicator

Header shows a **green "Live"** dot when serving the Remote API or an **amber "Snapshot"**
dot on seed data, plus the last-fetch timestamp and a **Refresh** button that busts the
server cache (`POST /api/org/refresh`) and refetches.

## Resilience

- **Error boundaries** wrap the app and each tree/list region — a render error shows a
  recoverable card, not a blank screen. See [Decisions](./decisions.md).
- **Health check:** `GET /health` → `{ "status": "ok" }`, wired to Render for auto-restart.
