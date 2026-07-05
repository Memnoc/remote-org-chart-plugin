---
sidebar_position: 2
title: Getting started
---

# Getting started

This page is the five-minute tour: what the app is, how to use it, how it works under
the hood, and why it was built the way it was. Everything here is expanded in the rest
of the docs — links throughout.

## What this is

An **organizational chart application built on Remote's public API**. It fetches every
employment from the Remote sandbox, resolves manager → direct-report relationships, and
renders the company as a single interactive tree you can search, filter, focus, and
export.

- **Live app:** [remote-org-chart-plugin.onrender.com](https://remote-org-chart-plugin.onrender.com)
- **Source:** [github.com/Memnoc/remote-org-chart-plugin](https://github.com/Memnoc/remote-org-chart-plugin)

No login, no setup — the live URL is ready to test.

## Using the app — a 60-second tour

1. **It opens collapsed**, like Remote's own chart: an **"Organisation" company node**
   with the top-level people underneath. Click any card's **reports pill** (the count +
   chevron) to expand that branch, or use **Expand all / Collapse all** (top-right).
2. **Click a person** — the card gets a blue ring, a **detail drawer** slides in
   (name, title, department, employment type, manager, direct reports), and the full
   **reporting chain** from the root down to that person lights up in amber.
3. **"View team →"** on any manager narrows the canvas to just their subtree; **"← Full
   org"** brings you back.
4. **Search** (`/` from anywhere) matches names, titles, and departments at once; the
   tree prunes to matches but keeps the ancestors leading to them. The **Filter** button
   adds department checkboxes on top.
5. The toolbar also offers a **List view** (flat, paginated, hierarchy by indentation),
   an **org stats panel** (headcount, managers, span of control, depth, per-department
   chart), and **Export CSV**.
6. Search, filters, and view mode live in the **URL** — copy the address bar and the
   link reproduces your exact view.
7. The header shows the **data source**: a green **Live** dot when serving the Remote
   API, an amber **Snapshot** dot when on fallback data, plus a Refresh button.

The full product surface is documented in [Features](./features.md).

## How it works

```
Browser ── React SPA (Vite + TypeScript)
   │   GET /api/org
   ▼
Express proxy — holds the API token server-side
   ├─ live path:  Remote API /v1/employments (+ per-id details)
   │              → keep active only → build reporting forest
   │              → cache 5 min → serve
   └─ fallback:   committed snapshot.json (always works)
```

One process serves both the SPA and the API from the same origin. The response is a
tree-shaped JSON forest; the frontend renders it with `react-d3-tree` and derives every
view (search, filter, focus, stats, CSV) from that single payload — no further network
round-trips. Details in [Architecture](./architecture.md) and
[API integration](./api-integration.md).

## Why it works this way

**Why a server-side proxy instead of calling Remote from the browser?**
The API token must never reach the browser. The proxy also gives one place for caching,
filtering, and tree-building — the frontend receives ready-to-render data.

**Why a snapshot fallback?**
The chart must always render. If the token is rotated, the API is down, or
the env var is missing, the server falls back to a committed dataset that contains every
edge case the live data does.

**Why per-employee detail requests (N+1)?**
Remote's list endpoint doesn't include manager fields — `manager_employment_id` only
exists on the per-id detail endpoint. That constraint forces one request per person,
mitigated with a bounded concurrency pool and the 5-minute cache. See
[API integration](./api-integration.md).

**Why one tree when the data has multiple roots?**
Real org data is messy: people with no manager, external managers, broken references,
even reporting cycles. The data layer keeps them as an honest *forest*; the render layer
joins the roots under a synthetic "Org" node so the whole company reads as one expandable
tree — nobody hidden, nothing faked in the data. See
[Edge cases](./edge-cases.md) and [Decisions](./decisions.md).

**Why does it show 148 people when Remote's own chart shows 125?**
The sandbox holds 175 employments; 148 are `active`. We filter out archived and pre-hire
records server-side and show every active person. Remote's chart additionally hides
active people with incomplete reporting lines — ours promotes them to visible roots
instead. See [Edge cases](./edge-cases.md).

## Run it locally

**Requirements:** Node.js ≥ 18

```bash
npm install
cp .env.example .env          # set REMOTE_API_TOKEN=<your token>
npm run dev                   # SPA on :5173, Express proxy on :3001
```

Open `http://localhost:5173`. Without a token the app runs on the snapshot — fully
functional, amber "Snapshot" dot in the header.

## Where to go next

- [Features](./features.md) — every capability, with implementation notes
- [Architecture](./architecture.md) — the wiring in detail
- [Edge cases](./edge-cases.md) — the messy-data handling
- [Decisions](./decisions.md) — ADR-style trade-off records
