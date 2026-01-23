---
description: UI stack conventions for injected toolbar.
alwaysApply: true
cursor:
  retrieval-strategy: always
---

# UI Rules

## Stack
- Use shadcn-style components in `components/ui/` for primitives.
- Use Tailwind for layout and spacing around primitives.

## Behavior
- Avoid silent failures; log at least a warning.
- Favor accessibility attributes for interactive elements.
