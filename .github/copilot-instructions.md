# Copilot Repository Instructions

## Core agent expectations for the extension repo.

# Core Rules

## Source of Truth
Always read the `documentation/` folder before making changes or proposing new features. If you change architecture, UI structure, or tooling, update the relevant documentation file in the same change.

## Rule Generation
The source rules live in `agent-rules/`. When you update these rule files, run `npm run rules:generate` to regenerate all provider outputs. This does not apply to changes limited to `documentation/`.

## Error Checks
After any significant change, run `npm run check` to verify for type errors.

## Local References
The `ProjectVisBug/` folder is local reference material only. Do not format, lint, or commit it.

## Extension UI Scope
The extension only renders injected UI. Do not add popup, options, or other extension windows unless explicitly requested.


## UI stack conventions for injected toolbar.

# UI Rules

## Stack
- Use shadcn-style components in `components/ui/` for primitives.
- Use Tailwind for layout and spacing around primitives.

## Behavior
- Avoid silent failures; log at least a warning.
- Favor accessibility attributes for interactive elements.
