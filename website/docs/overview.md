---
slug: /overview
sidebar_position: 1
title: Overview
---

# Remote Org Chart

An org chart application built on **Remote's API**. It renders manager → direct-report
hierarchies as an interactive tree and list, with live data proxied server-side and a
committed snapshot as a guaranteed fallback.

- **Live app:** [remote-org-chart-plugin.onrender.com](https://remote-org-chart-plugin.onrender.com)
- **Source:** [github.com/Memnoc/remote-org-chart-plugin](https://github.com/Memnoc/remote-org-chart-plugin)

:::tip Reviewing this for the assignment?
Start with [Getting started](./getting-started.md) — a five-minute tour of what it is,
how to use it, and why it works the way it does. Then [Features](./features.md) for the
full product surface, [Architecture](./architecture.md) for how it is wired, and
[Decisions](./decisions.md) for the trade-offs behind it.
:::

## What it does

- Fetches every employment from the Remote sandbox API, keeps **active staff only**
  (archived and pre-hire employments are filtered out), resolves manager relationships,
  and builds a **forest** of reporting trees.
- Renders the whole org as **one expandable tree** — multiple data roots are joined under
  a synthetic "Org" node at render time, so nobody is hidden — plus a searchable
  **list view**.
- Handles the messy real-world shapes: no manager, external managers, dangling references,
  reporting cycles, missing fields, and multiple roots — see [Edge cases](./edge-cases.md).
- Falls back to a committed snapshot so a reviewer **always** sees a working chart, even
  with no token or an unreachable API.

## Run it locally

**Requirements:** Node.js ≥ 18

```bash
npm install
cp .env.example .env          # set REMOTE_API_TOKEN=<your token>
npm run dev                   # SPA on :5173, Express proxy on :3001
```

Open `http://localhost:5173`. Without `REMOTE_API_TOKEN` the app serves snapshot data.

## At a glance

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript |
| Visualization | react-d3-tree |
| Backend | Express (TypeScript), single process |
| Deploy | Render (free tier), single service |
| Tests | Vitest |

Full breakdown in [Tech stack](./tech-stack.md).
