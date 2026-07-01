---
title: Remote API Integration
status: stable
owner: matteo-stara
updated: 2026-07-01
---

# Remote API Integration

## Overview

Documents how this app integrates with Remote's REST API: which endpoints are called, how authentication works, how the org hierarchy is derived from the data, and how edge cases are handled.

## Background

Remote's API does not expose a dedicated "org chart" endpoint. Manager→report relationships must be assembled from individual employment detail records. Understanding this constraint is the core integration challenge.

## Details

### Authentication

Bearer token, passed in the `Authorization` header:

```
Authorization: Bearer <REMOTE_API_TOKEN>
```

Token is stored as an environment variable on the server. Never sent to the browser.

Sandbox base URL: `https://gateway.remote.com/v1`

### Endpoints used

| Endpoint | Purpose |
|---|---|
| `GET /v1/employments?page=N&page_size=100` | Paginated list of all employments (IDs, names, job titles, departments) |
| `GET /v1/employments/{id}` | Full employment detail — includes `manager_employment_id`, `manager_email` |

### Why two endpoints?

`GET /v1/employments` returns `MinimalEmployment` — it includes `full_name`, `job_title`, `department`, but **no manager fields**. Manager relationships only appear on the full detail record. Building the org tree therefore requires fetching every employment individually after listing their IDs.

### Hierarchy construction

1. Collect all employment IDs from the paginated list.
2. Fetch each detail concurrently (bounded pool of 8 parallel requests).
3. Map each `RemoteEmployment` to a typed `Person` via `mapper.ts`.
4. Build the forest in `treeBuilder.ts`: for each `Person`, the edge is `person.managerId → parent.id`. Roots have `managerId === null`.

### Edge case policy

| Scenario | Field state | Handling |
|---|---|---|
| No manager | `manager_employment_id: null`, `manager_email: null` | Root node |
| External manager | `manager_employment_id: null`, `manager_email` set | Root with "reports to X (external)" badge |
| Dangling reference | `manager_employment_id` set, no matching person in dataset | Treat as root (orphan) |
| Reporting cycle | A.managerId = B, B.managerId = A | Detect via path traversal; cycle nodes become roots with "cycle detected" badge |
| Missing data | `full_name`, `job_title`, or `department` is null | Display as `—`; never blank |

### Concurrency & caching

Detail fetches run in batches of 8 (`Promise.allSettled`). Individual failures are silently skipped — the rest of the org still renders. The assembled forest is cached in process memory for 5 minutes.

### MCP

Remote's MCP (Model Context Protocol) server was used during development to explore the sandbox schema and confirm field availability. It was not used at runtime — see [ADR-0002](./adr/0002-rest-over-mcp.md).

## Decisions & Trade-offs

- `Promise.allSettled` over `Promise.all`: individual detail fetch failures don't abort the whole fetch.
- Pool size 8: balances speed against rate-limit risk on the sandbox.
- Cycle detection via path traversal per-node: O(n²) worst case but sufficient at demo scale.

## Limitations & Known Issues

- No webhook integration: org data is fetched on demand, cached 5 min. Changes in Remote don't push to the app.
- `manager` (name string) and `manager_email` are used for display only when `manager_employment_id` is null. If an off-Remote manager's name changes in Remote, the display name will lag until the cache expires.

## References

- [Remote API docs](https://developer.remote.com)
- [Architecture overview](./architecture.md)
- [ADR-0002: REST over Remote MCP at runtime](./adr/0002-rest-over-mcp.md)
