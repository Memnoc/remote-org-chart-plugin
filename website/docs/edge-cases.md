---
sidebar_position: 5
title: Edge cases
---

# Edge cases

Real org data is irregular. The forest builder handles each of these explicitly rather than
assuming a single clean CEO-rooted tree.

| Scenario | Handling |
|---|---|
| No manager (`manager_employment_id: null`) | Rendered as a root node |
| External manager (`manager_email` set, no id) | Root with a "reports to X (external)" badge |
| Dangling manager reference (id not in dataset) | Treated as a root (orphan) |
| Reporting cycle (A → B → A) | Cycle detected; cycle nodes rendered as roots with a "cycle detected" badge |
| Missing name / title / department | Displayed as `—`, never blank |
| Multiple root nodes | Joined under a virtual "Org" root — one expandable tree, no one hidden |
| Non-active employments (archived / pre-hire) | Filtered out server-side (`status === 'active'`) |

Cycle detection walks each node's manager chain and flags any node seen twice; flagged
nodes are promoted to roots, which breaks the cycle while keeping every person visible. See
[Architecture](./architecture.md#building-the-forest) for the algorithm.

The committed snapshot embeds all of these shapes, so the Vitest suite exercises them
directly against `buildForest()`.
