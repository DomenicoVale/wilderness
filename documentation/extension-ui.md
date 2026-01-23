# Content UI

## Overview
The Wilderness UI is injected into the active page via a WXT content script. It renders a React component into a shadow root for isolation.

## Key Files
- `entrypoints/content.tsx`: Creates and mounts the shadow root UI.
- `entrypoints/content-ui/content-toolbar.tsx`: Toolbar React component.
- `entrypoints/content-ui/style.css`: Tailwind entrypoint and CSS variables.

## UI Stack
- React for rendering.
- shadcn-style UI primitives in `components/ui/`.
- Tailwind for layout and styling around the UI primitives.

## Behavior
- A bottom-centered toolbar is always visible on supported pages.
- Menu items log to the console as placeholders for future tools.
- The sample button triggers a simple `window.alert`.
