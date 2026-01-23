# Wilderness Extension Overview

Wilderness is an in-house browser extension focused on designers and internal teams. The UI is injected into the active page rather than shown in a popup window. The initial surface is a floating toolbar that will grow into a set of page inspection and design utilities.

## Goals
- Inject a consistent, low-profile toolbar into any page.
- Provide quick access to tools for style inspection, DOM info, and design workflows.
- Keep the UI system modular and composable with shadcn-style components and Tailwind.
- Avoid popup or options UIs unless explicitly requested.

## Project Structure
- `entrypoints/`: WXT entrypoints such as content scripts and background scripts.
- `entrypoints/content-ui/`: React UI rendered by the content script.
- `components/ui/`: Shared shadcn-style UI primitives.
- `documentation/`: Source of truth for architecture, tooling, and agent guidance.
