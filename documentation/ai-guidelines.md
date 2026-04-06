# AI Guidelines

## Source of Truth
All agents must check the `documentation/` folder before making changes or proposing new features. If a requested change touches architecture, UI structure, or tooling, update the relevant documentation file in the same PR.

## Update Expectations
- Keep documentation aligned with code changes.
- Add new documentation entries when introducing new subsystems or workflows.
- Avoid placeholders and keep instructions actionable.

## Code Organization Expectations
- Keep source files at or below **700 LOC**; split features into smaller modules before extending oversized files.
- Prefer DRY implementations: reuse existing helpers/modules and avoid duplicated logic.
- Follow browser-extension JavaScript best practices: thin entrypoints, explicit setup/cleanup for listeners/observers/timers, and predictable lifecycle-safe behavior.

## React-First UI Rule
- Use React for panels and non-fast-changing UI by default, with JSX conditional rendering preferred over manual `createElement` trees.
- Direct DOM access is allowed only when needed for performance-sensitive tooling surfaces (for example: rulers, layout guides, spacing overlays) or when integrating imperative browser APIs through refs.
- When imperative updates are required inside React-managed UI, use refs plus `requestAnimationFrame`/layout effects to keep visual updates deterministic and avoid ad-hoc DOM mutation paths.
- For unavoidable imperative DOM/SVG work, prefer existing helper libraries already in the repo (for example `jquery`) to reduce boilerplate and keep mutation code concise.

## Agent Rules
- Canonical agent prompt sources live in `.harness/src/prompts/`.
- After modifying harness prompt sources, run `npm run rules:generate` to apply Harness-managed state.
