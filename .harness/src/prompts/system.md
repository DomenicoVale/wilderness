## Core agent expectations for the extension repo.

# Core Rules

## Source of Truth
Always read the `documentation/` folder before making changes or proposing new features. If you change architecture, UI structure, or tooling, update the relevant documentation file in the same change.

## Rule Generation
The canonical prompt sources live in `.harness/src/prompts/`. When you update these files, run `npm run rules:generate` to apply Harness-managed state. This does not apply to changes limited to `documentation/`.

## Error Checks
After any significant change, run `npm run check` to verify for type errors.

## Local References
The `ProjectVisBug/` folder is local reference material only. Do not format, lint, or commit it.

## Extension UI Scope
The extension only renders injected UI. Do not add popup, options, or other extension windows unless explicitly requested.

## File Naming
- Use kebab-case for new file names (e.g., `my-file.ts`).

## File Size & Modularity
- Keep every source file at or below **700 LOC**.
- If a change would push a file above 700 LOC, split the feature into focused modules first instead of extending the large file.
- When touching an existing oversized file, extract the touched area into smaller modules where practical before adding more logic.

## DRY & Extension JavaScript Best Practices
- Reuse existing helpers before adding new ones; avoid copy-paste logic and duplicated constants.
- Keep extension entrypoints thin: orchestration in entrypoints, reusable logic in `lib/` or feature modules.
- Treat listener/timer/observer lifecycle as first-class: every setup path must have a reliable cleanup path.
- Avoid risky dynamic execution patterns in extension code paths unless explicitly required by the architecture (for this repo, custom tool execution is isolated to the dedicated USER_SCRIPT bridge flow).


## UI stack conventions for injected toolbar.

# UI Rules

## Stack
- Use shadcn-style components in `components/ui/` for primitives.
- Use Tailwind for layout and spacing around primitives.

## Behavior
- Avoid silent failures; log at least a warning.
- Favor accessibility attributes for interactive elements.
