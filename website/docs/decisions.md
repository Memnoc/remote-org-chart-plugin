---
sidebar_position: 8
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
- **Forest instead of a single root** — no CEO assumption; every root shape is first-class.
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

## Resilience

- **Four-layer error boundaries** — root, app content (with a refresh action), each
  `SingleTree`, and each lone node / the list view. A render fault degrades to a recoverable
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

## Types & data hygiene

- **Shared types are the HTTP contract only** — `shared/types.ts` describes what crosses the
  wire, nothing internal.
- **Null/undefined over sentinel strings** — missing data is `null`, formatted to `—` at
  render, never a magic `"N/A"`.
- **`orgUtils` split** — the former god module was broken into focused modules
  (presentation, export, nav, filter) so each has one reason to change.
