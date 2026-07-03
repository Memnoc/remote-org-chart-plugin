# Project instructions

## Documentation discipline (non-negotiable)

Any commit that **adds a feature** or **changes architecture** MUST update the relevant docs
**in the same commit**. Do not defer it, do not wait to be asked — treat missing docs as an
incomplete change. This exists because the human maintainer may forget to ask.

What counts as triggering a doc update:
- New user-facing capability, UI surface, route, or CLI/script → **FEATURES.md**
- Architectural decision or trade-off (new service, hosting change, data flow, dependency
  swap, deliberate deferral) → **DECISIONS.md** (add an ADR-style section)
- Stack, build pipeline, deploy target, or env var change → **TECH_STACK.md**
- Setup steps, public URLs, or run commands change → **README.md**
- Any of the above → mirror it in the Docusaurus site under **`website/docs/`** (the pages
  there track the root `.md` files: overview, features, architecture, api-integration,
  edge-cases, tech-stack, deployment, decisions)

Before proposing a commit, self-check: "Does this change alter behaviour, architecture, or
ops? If yes, which of the above did I update?" If none apply (pure refactor, test-only,
typo), say so explicitly in the commit rationale.

A `pre-commit` hook (`.githooks/pre-commit`, auto-enabled by the `prepare` script on
`npm install`) prints a reminder when staged code has no staged docs — it is a non-blocking
safety net, not a substitute for this discipline.

## Environment notes

- A Claude Code guardrail (`~/.claude/hooks/godmode-guardrails.sh`) blocks `rm` and `kill`
  at the Bash-tool level. Hand those commands to the human to run; do not try to bypass.
- Never use `--no-verify` or skip git hooks unless the human explicitly asks.
- Push only when explicitly authorized, per task.
