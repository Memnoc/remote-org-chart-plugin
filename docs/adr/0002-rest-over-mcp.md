---
adr: "0002"
title: REST over Remote MCP at runtime
status: accepted
date: 2026-07-01
---

# ADR-0002: REST over Remote MCP at runtime

## Context

Remote provides a Model Context Protocol (MCP) server for sandbox access, so it was a candidate for the app's runtime data layer.

MCP is a protocol for exposing tools to LLM agents — it defines structured function-call interfaces for AI models to consume. It was not designed as a backend data layer for web apps.

Two options:
1. Use Remote MCP as the app's runtime data source.
2. Use Remote's REST API directly at runtime; use MCP as a dev-time exploration tool.

## Decision

Call Remote's REST API at runtime. Use Remote MCP during development to explore the sandbox schema, confirm field availability, and accelerate understanding of the data shape.

## Consequences

**Positive:** REST is the correct abstraction for a server-side data layer — typed responses, no agent runtime dependency, standard HTTP caching and error handling. The architecture is simpler and fully explainable.

**Negative / trade-offs:** Does not produce a runtime MCP integration.

**Neutral:** MCP's role in the workflow (dev-time schema exploration by the LLM working on this project) is documented in the README as part of the AI-assisted development approach.
