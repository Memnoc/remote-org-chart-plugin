---
sidebar_position: 6
title: Tech stack
---

# Tech stack

| Layer | Language |
|-------|----------|
| Frontend | TypeScript 5.5 + React 18 |
| Backend | TypeScript 5.5 + Node.js (ESM) |
| Shared types | TypeScript — single `shared/types.ts` consumed by both |

## Frontend

- **React 18** — hooks-based state; no global state library. `useState` / `useMemo` /
  `useEffect`, plus URL query params as persistent state.
- **Vite 5** — dev server, HMR, production bundler (outputs to `dist/`).
- **react-d3-tree 3.6** — SVG org-tree renderer. Custom nodes via `renderCustomNodeElement`
  (a `foreignObject` wrapping React components). No imperative expand/collapse API — that is
  achieved by remounting trees via a React `key` change with `initialDepth`.
- **Styling** — inline styles only, no CSS framework. Design tokens are CSS custom
  properties; theming is a `data-theme` attribute on `<html>`. Icons are inline SVGs.

## Backend

- **Express 4** — single-file server (`server/index.ts`).
- **Node built-ins only** — `fs.readFileSync` for the snapshot, native `fetch` for Remote
  API calls (Node 18+).
- **ESM** — `"type": "module"`, compiled with `moduleResolution: NodeNext`.
- **Caching** — one in-memory `cache` variable + timestamp, 5-minute TTL; `POST
  /api/org/refresh` nulls it.

## Build

```bash
npm run build
```

Two compilations:

1. **Vite** — bundles the React SPA → `dist/`.
2. **tsc** (`tsconfig.server.json`) — compiles the Express server → `dist-server/`.

```bash
npm start   # node dist-server/server/index.js — serves API + SPA
```

This docs site builds separately (`npm run docs:build` → `website/build/`) and deploys to
GitHub Pages via Actions — see [Deployment](./deployment.md#docs-hosting).

### Dev mode

```bash
npm run dev
```

Runs `vite` (port 5173, proxying `/api` → `http://localhost:3001`) and `tsx watch
server/index.ts` (port 3001) concurrently. The proxy means the frontend calls `/api/org`
with the same code path in dev and production — no CORS config. The docs site runs
separately with `npm --prefix website start` (Docusaurus dev server on port 3000).

## Linting

**ESLint** (flat config) with `typescript-eslint` and `eslint-plugin-react-hooks` —
rules-of-hooks and `exhaustive-deps` run as errors, mechanically enforcing the effect
discipline documented in [Design decisions](./decisions.md). `npm run lint`.

## Testing

**Vitest 2.** `npm test` runs once; `npm run test:watch` watches. Tests live in `tests/`,
covering the mapper and the tree-builder against the snapshot fixture.
