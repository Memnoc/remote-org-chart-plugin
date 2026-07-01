---
adr: "0001"
title: Server-side proxy over client-side API calls
status: accepted
date: 2026-07-01
---

# ADR-0001: Server-side proxy over client-side API calls

## Context

The app must call Remote's API using a Bearer token. The token is a personal sandbox credential. The app is deployed publicly, meaning any browser that opens it can inspect network requests.

Two options:
1. Call the Remote API directly from the browser (SPA).
2. Call the Remote API from a server-side proxy; browser only talks to `/api/org`.

## Decision

Use a server-side Express proxy. The `REMOTE_API_TOKEN` is stored as a server environment variable and never sent to the browser.

## Consequences

**Positive:** Token is not exposed in browser network inspector or JS bundles. The browser/API contract is a stable internal shape (`OrgResponse`), decoupled from Remote's response schema.

**Negative / trade-offs:** Requires running a Node.js server (not a static-only deploy). Adds one network hop (browser → proxy → Remote).

**Neutral:** The proxy is also the natural place for in-memory caching and the snapshot fallback.
