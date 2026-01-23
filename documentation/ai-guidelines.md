# AI Guidelines

## Source of Truth
All agents must check the `documentation/` folder before making changes or proposing new features. If a requested change touches architecture, UI structure, or tooling, update the relevant documentation file in the same PR.

## Update Expectations
- Keep documentation aligned with code changes.
- Add new documentation entries when introducing new subsystems or workflows.
- Avoid placeholders and keep instructions actionable.

## Agent Rules
- Canonical agent rules live in `agent-rules/`.
- After modifying rules in `agent-rules/`, run `npm run rules:generate` to regenerate provider outputs.
