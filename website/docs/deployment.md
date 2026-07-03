---
sidebar_position: 7
title: Deployment
---

# Deployment

Deployed on **Render** (free tier) as a single Web Service from this repo.

```yaml
# render.yaml
services:
  - type: web
    name: remote-org-chart
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: REMOTE_API_TOKEN
        sync: false   # set manually in Render dashboard
      - key: PORT
        value: "3001"
```

- **Deploy trigger:** push to `main` → Render auto-deploys. No separate CI/CD pipeline.
- **Build:** `npm run build` compiles the SPA (`dist/`) and the server (`dist-server/`).
  The docs site is built and deployed separately (see below).
- **Start:** `npm start` runs the compiled Express server, which serves the API and the SPA
  from one origin.

## Environment variables

- **`REMOTE_API_TOKEN`** — set manually in the Render dashboard (kept out of `render.yaml`
  to avoid committing secrets). When absent, the app runs on snapshot data.
- **`PORT`** — `3001` from `render.yaml`; Express binds to `process.env.PORT ?? 3001`.

## Health check & cold start

- **Health check:** `GET /health` configured in Render → automatic restart if it stops
  responding.
- **Cold start:** the free tier sleeps after ~15 min idle (30–60 s cold start on first
  hit). A keep-alive ping at [cron-job.org](https://cron-job.org) hits `/health` every
  10 min during the review window. The snapshot fallback means even a cold or tokenless hit
  renders a full chart.

## Docs hosting

This Docusaurus site is hosted on **GitHub Pages**, decoupled from the Render app:
`https://memnoc.github.io/remote-org-chart-plugin/`.

A GitHub Actions workflow (`.github/workflows/deploy-docs.yml`) builds `website/` and
publishes it on every push to `main` that touches `website/**`. Keeping the docs off the
Render service means:

- **No cold start** — GitHub Pages is a static CDN, always instant, even when the free-tier
  Render app is asleep.
- **Faster app deploys** — the docs build is out of the app's `npm run build`, so app
  deploys stay at baseline.
- **Zero cost** — both GitHub Pages and the Render free tier are $0.

The site's `baseUrl` is `/remote-org-chart-plugin/` so asset paths resolve under the Pages
project sub-path. "Open App" in the navbar links back to the Render app.
