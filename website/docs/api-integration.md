---
sidebar_position: 4
title: Remote API integration
---

# Remote API integration

- **Base URL:** `https://gateway.remote-sandbox.com/v1`
- **Auth:** Bearer token via `REMOTE_API_TOKEN` — held server-side, never sent to the browser.

## Pagination + detail fetch (N+1)

```
GET /v1/employments?page=N&page_size=100     → list of employment IDs
GET /v1/employments/{id}                      → per-employee detail
```

The list endpoint returns a **minimal** employment with no manager fields. Manager
relationships (`manager_employment_id`, `manager_email`) appear **only** on the detail
endpoint. A single list call would be cleaner, but the data isn't there — so the client
pages the full list, then fetches each employee's detail.

Fields used from detail: `full_name`, `job_title`, `department`, `manager_employment_id`,
`status`.

## Concurrency & resilience

- Detail fetches run in **batches of 8** via `Promise.allSettled`.
- An individual failure is **skipped**, not fatal — the rest of the org still renders. The
  skip count surfaces to the client as `skippedCount`.
- Every request carries an `AbortSignal.timeout` so a hung call can't stall the batch.
- **Response-shape guards** on both endpoints throw a diagnosable error if the API shape
  drifts, instead of silently producing an empty chart.

Mitigations for the N+1 cost: bounded concurrency (pool 8) plus a 5-minute in-memory cache.

## Fallback

If the token is absent or the live fetch throws, the server loads `server/snapshot.json`
(a representative seed dataset). The response's `source` field reports `'live'` vs
`'snapshot'` so the UI can show the correct data-source badge.

## Why REST at runtime, not Remote MCP

Remote MCP is designed for LLM agents — structured tool definitions for models to call.
Using it as an app backend would add an agent runtime dependency for no benefit over direct
REST. REST is the correct choice for a server-side data layer. MCP was used **during
development** to explore the sandbox schema and accelerate understanding of the API surface.
