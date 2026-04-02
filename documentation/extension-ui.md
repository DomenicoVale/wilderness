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

## Rendering Boundaries
- `entrypoints/content.tsx` + `entrypoints/content-ui/**`: React UI rendered in a shadow root (toolbar, dropdowns, console panel).
- `entrypoints/content-ui/guides/**`: DOM-driven overlays/custom elements with direct style injection.
- `entrypoints/content-ui/info/**`: DOM-driven inspection tips with direct style injection.
- `entrypoints/custom-tools/**`: Separate extension page built with React + Tailwind + shadcn primitives.
- `public/console-interceptor.js`: Plain JavaScript running in MAIN world; no React/UI framework.

## Behavior
- The toolbar only mounts after the user clicks the extension action.
- The content script is injected into the active tab on click.
- If injection fails (unsupported page or blocked access), the action icon shows a warning badge.
- Enabled origins keep the toolbar mounted across reloads and tab switches.
- Menu items log to the console as placeholders for future tools.
- The sample button triggers a simple `window.alert`.
- The Guides button toggles a ruler mode that measures elements and distances.
- Guides mode shows a small settings bar for label visibility.
- The Guides settings popup closes when clicking outside or pressing Escape, and reopens on hover while Guides remains active.
- Guides blocks page mouse handlers while active.
- The Info button toggles an inspector tooltip for styles.
- While Info is active, `[CLICKTIP:ON/OFF]` controls whether clicking pins a tooltip card or only pins outline/layout overlays.
- While Info is active, `[LAYOUTDIST:ON/OFF]` controls whether spacing overlays show full item-to-item whitespace or CSS gap only.
- Hovering an element in Guides mode shows full-edge dotted guides.
- Custom tools are selectable from a button-styled dropdown in the toolbar.
- Multiple custom tools can be active at once; the toolbar button shows a badge with active count.
- Custom tool code is executed by the background worker through `userScripts` when available.
- Browsers without `userScripts` run custom tools through `browser.scripting.executeScript` in `MAIN` world.

## Custom Tools Editor
- The custom tools editor opens in a new extension tab.
- Monaco editor provides JavaScript editing with formatting and validation actions.
- Validation checks syntax via parser tooling (not `eval` / `new Function`).
- The right-side panel reserves 30% width for future AI assistance.
