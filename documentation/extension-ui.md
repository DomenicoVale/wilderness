# Content UI

## Overview
The Wilderness UI is injected into the active page via a WXT content script. It renders a React component into a shadow root for isolation.

## Key Files
- `entrypoints/content.tsx`: Creates and mounts the shadow root UI.
- `entrypoints/content-ui/content-toolbar.tsx`: Toolbar React component.
- `entrypoints/content-ui/style.css`: Tailwind entrypoint and CSS variables.
- `entrypoints/content-ui/guides/`: Guides tool overlays and measurement logic.
- `entrypoints/content-ui/guides/guides_tool.ts`: Injected Guides overlay styling.

## UI Stack
- React for rendering.
- shadcn-style UI primitives in `components/ui/`.
- Tailwind for layout and styling around the UI primitives.

## Behavior
- The toolbar only mounts after the user clicks the extension action.
- The content script is injected into the active tab on click.
- Menu items log to the console as placeholders for future tools.
- The sample button triggers a simple `window.alert`.
- The Guides button toggles a ruler mode that measures elements and distances.
- Guides mode shows a small settings bar for label visibility.
- Guides blocks page mouse handlers while active.
- The Info button toggles an inspector tooltip for styles.
- Hovering an element in Guides mode shows full-edge dotted guides.
