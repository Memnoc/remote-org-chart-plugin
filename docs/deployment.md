---
title: Deployment Guide
status: stable
owner: matteo-stara
updated: 2026-07-01
---

# Deployment Guide

## Overview

How to deploy the Remote Org Chart app to Render (free tier) and keep it warm during review.

## Background

The app is a single Node.js process: Express serves both the compiled SPA (`dist/`) and the `/api` routes. This means one service, one deploy, one URL.

## Details

### Build

```bash
npm run build
# → Vite compiles SPA to dist/
# → tsc compiles server to dist-server/
```

### Start

```bash
npm start
# → node dist-server/index.js
# Express listens on $PORT (default 3001)
# Serves dist/ for all non-/api routes
# Serves /api/org and /health
```

### Render setup

1. Push repo to GitHub (public).
2. Create new **Web Service** in Render, connect the repo.
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variable: `REMOTE_API_TOKEN` = your sandbox token (set in Render dashboard, not committed).
6. Deploy. Render assigns a public `*.onrender.com` URL.

`render.yaml` in the repo root pre-configures steps 3–5 for one-click deploy.

### Cold-start mitigation

Render free tier spins down after ~15 min idle. First request after sleep takes 30–60s.

**Fix for the review window:** configure a free cron job at [cron-job.org](https://cron-job.org) to `GET https://<your-app>.onrender.com/health` every 10 minutes. This keeps the service warm. The `/health` endpoint returns `{"status":"ok"}` with no side effects.

**Even without the ping:** the snapshot fallback means the app always returns a full org chart, even on a cold start with no token — it just takes the cold-start delay.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `REMOTE_API_TOKEN` | No | Remote sandbox API token. Absent → snapshot mode. |
| `PORT` | No | HTTP port. Default `3001`. Render sets this automatically. |

## Decisions & Trade-offs

- **Single process vs. split (CDN + API):** single process simplifies deploy to one Render service. No CORS config. Acceptable for a demo.
- **Render free tier vs. paid ($7/mo):** free tier has the cold-start issue; keep-alive ping neutralizes it for a bounded review window at zero cost.

## Limitations & Known Issues

- Render free tier: 750 instance-hours/month (enough for continuous uptime for ~1 month).
- In-process cache resets on each Render deploy or restart.
- No TLS termination config needed — Render provides HTTPS on `*.onrender.com` automatically.

## References

- [render.yaml](../render.yaml)
- [Architecture overview](./architecture.md)
- [Render docs](https://render.com/docs)
