---
sidebar_position: 9
title: Design decisions
---

# Design decisions & trade-offs

The full ADR set lives in [`DECISIONS.md`](https://github.com/Memnoc/remote-org-chart-plugin/blob/main/DECISIONS.md).
This page summarises the load-bearing ones.

## Architecture & data

- **Single-service deployment** — one Express process serves the SPA, the API, and these
  docs. No CORS, no second host; simplest possible deploy for the scope.
- **In-memory cache over a persistent store** — a 5-minute TTL on a single variable. The
  data is read-only and cheap to rebuild; a database would be dead weight.
- **Paginated list then per-employee detail fetch** — forced by the API: manager fields
  only exist on the detail endpoint. Mitigated with pool-of-8 concurrency and caching.
- **Active-only employment filter** — the API returns every lifecycle state (measured:
  175 = 148 active + 23 archived + 4 pre-hire); the server keeps only `status === 'active'`.
  Offboarded and not-yet-started people don't belong on an org chart.
- **Forest at the data layer, virtual root at the render layer** — the data keeps its 9
  genuine roots (no fake CEO); the tree view joins them under a synthetic "Organisation" node so the
  canvas shows one expandable tree, Remote-style, with nobody hidden. List view, stats, and
  CSV consume the honest forest.
- **Cycle detection at build time, not render time** — cycles are broken once while the
  forest is built, so the renderer never has to reason about them.
- **Snapshot fallback instead of an error state** — a reviewer always sees a working chart;
  the failure mode is degraded data, not a blank screen.

## Frontend

- **react-d3-tree over custom D3** — pan/zoom/collapse and forest layout out of the box.
- **Expand/collapse all via key remount** — the library has no imperative API, so a `key`
  change with `initialDepth` is the idiomatic reset.
- **Inline styles, no CSS framework** — design tokens as CSS custom properties keep theming
  in one place without a dependency.
- **No global state library** — `useState`/`useMemo` plus URL params cover every need here.
- **URL state via `history.replaceState`, no router** — one screen; a router would be
  ceremony. Search, filters, and view mode live in query params.
- **Client-side CSV export** — walks the forest in the browser; no server round-trip.
- **Safari foreignObject workaround** — WebKit paints foreignObject HTML at the SVG origin
  when it uses `position`/`transform`/`transition` (WebKit bug 23113; react-d3-tree
  issue #284) — on a real iPhone every card stacked at the top-left while the pure-SVG
  links drew correctly, invisible in desktop DevTools emulation (Blink). Node cards drop
  those properties on Safari (`IS_SAFARI` gate — static chevron, no hover transitions)
  instead of reimplementing the node layer as an HTML overlay.

## Resilience

- **Four-layer error boundaries** — root, app content (with a refresh action), each
  `SingleTree`, and the list view. A render fault degrades to a recoverable
  card, isolated to the smallest region.
- **Client-side fetch timeouts** — `AbortSignal.timeout` on both GET (120 s) and refresh
  POST (10 s) so the UI never hangs on a stalled server.
- **Remote API response-shape validation** — runtime guards throw a diagnosable error on
  shape drift instead of silently rendering an empty chart.

## Deliberately deferred

Documented as ADRs so future reviews don't re-litigate them:

- **Express 4 async handlers aren't auto-caught** by the error middleware — every current
  async route is guarded by try/catch; revisit if routes multiply.
- **No retry logic** on Remote failures — the snapshot is the recovery path;
  `Promise.allSettled` already handles per-employee failures.
- **No error telemetry** — `componentDidCatch` is the ready hook; it only needs an SDK call.
- **No `process.on('unhandledRejection')` handler** — Render auto-restarts on crash; a
  one-line handler is the fix if the server grows.
- **No full profile in the detail drawer** — the app is a public URL behind an
  unauthenticated proxy, so the server-side mapper acts as a PII filter: only the six
  org-relevant fields ever reach the client. Location, start date, and contact details
  stay behind Remote's own authenticated UI; richer profiles would need a separate
  authenticated endpoint.

## Types & data hygiene

- **Shared types are the HTTP contract only** — `shared/types.ts` describes what crosses the
  wire, nothing internal.
- **Null/undefined over sentinel strings** — missing data stays `null`/`undefined` end to
  end (a missing name falls back to "Unknown Employee" at tree-build; missing title or
  department is simply omitted at render), never a magic `"N/A"` or `—`.
- **`orgUtils` split** — the former god module was broken into focused modules
  (presentation, export, nav, filter) so each has one reason to change.
