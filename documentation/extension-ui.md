# Content UI

## Overview
The Wilderness UI is injected into the active page via a WXT content script. It renders a React component into a shadow root for isolation.

## Key Files
- `entrypoints/content.tsx`: Creates and mounts the shadow root UI.
- `entrypoints/content-ui/content-toolbar.tsx`: Toolbar React component.
- `lib/custom-tools/`: Shared custom-tool store, permission helpers, editor actions, bridge runner, and background bridge service.
- `entrypoints/content-ui/style.css`: Tailwind entrypoint and CSS variables for the shadow-root React UI.
- `entrypoints/content-ui/content-toolbar.css`: Toolbar and tools-submenu styles.
- `entrypoints/content-ui/console/console-panel.css`: Console panel styles.
- `entrypoints/content-ui/guides/`: Guides tool overlays and measurement logic.
- `entrypoints/content-ui/guides/guides.css`: Guides overlay CSS source.
- `entrypoints/content-ui/info/styles/*.styles.css`: Inspect panel/overlay CSS sections.

## UI Stack
- React for rendering.
- shadcn-style UI primitives in `components/ui/`.
- Tailwind for layout and styling around the UI primitives.

## Rendering Boundaries
- `entrypoints/content.tsx` + `entrypoints/content-ui/**`: React UI rendered in a shadow root (toolbar, dropdowns, console panel).
- `entrypoints/content-ui/guides/**`: DOM-driven overlays/custom elements with runtime injection of bundled CSS files.
- `entrypoints/content-ui/info/**`: React-rendered inspect panels mounted into the page via portal, plus DOM-driven inspection overlays; all inspect styles are injected at runtime from bundled CSS files.
- `entrypoints/custom-tools/**`: Separate extension page built with React + Tailwind + shadcn primitives.
- `public/console-interceptor.js`: Plain JavaScript running in MAIN world; no React/UI framework.

## Styling Pipeline
- Shadow-root React UI styles come from regular CSS files imported by `entrypoints/content.tsx`, processed by the same Tailwind/PostCSS config used across the repo.
- Guides/Inspect styles are authored in `.css` files and injected into the page DOM by `guides/guides-styles.ts` and `info/core/styles.ts` so non-shadow overlays keep correct scope and performance.

## Behavior
- The toolbar only mounts while the user has the extension globally enabled from the browser action.
- Clicking the browser action toggles the extension on/off for all supported HTTP(S) pages, not just the current origin.
- If injection fails (unsupported page or blocked access), the action icon shows a warning badge.
- Enabled state keeps the toolbar mounted across reloads, tab switches, and extension restarts.
- The action icon shows a green enabled indicator while the extension is on.
- The enabled indicator is rendered by `lib/background/action-indicator.ts` as an icon overlay dot (not a text badge), while warning state still uses an orange `!` badge.
- New console errors show a temporary toast bubble directly under `[CONSOLE]` (single slot), starting 8px below the toolbar, then disappearing with a short pop animation.
- Menu items log to the console as placeholders for future tools.
- The sample button triggers a simple `window.alert`.
- The Guides button toggles a ruler mode that measures elements and distances.
- Guides mode shows a small settings bar for label visibility.
- The Guides settings popup closes when clicking outside or pressing Escape, and reopens on hover while Guides remains active.
- Guides blocks page mouse handlers while active.
- The Inspect button toggles a right-side inspector panel for styles.
- While Inspect is active, `[LAYOUTDIST:ON/OFF]` controls whether spacing overlays show full item-to-item whitespace or CSS gap only.
- The Inspect right panel and left tree/media panel support collapsing and show `[+]` when closed.
- Inspect panel shells are React-rendered and mounted directly into page DOM via React portal wiring in `panel/shell.tsx` (wired by `panel/index.tsx`).
- The Inspect right panel is draggable from its header; collapsed and expanded states stay anchored to the dragged panel position.
- Inspect panel positions/sizes are restored from one global persisted layout state shared across pages and sessions.
- Clicking the selector copies it and briefly shows `Copied` tooltip feedback.
- The Inspect panel uses grouped inspector blocks (`Position`, `Layout`, `Spacing`, `Appearance`, `Typography`, `All CSS Props`) with compact segmented controls, searchable CSS props, and CSS-property labels.
- Inspector property controls include a `var` button before reset, opening a searchable variable picker for scoped CSS custom properties on the selected element with color chips for color variables.
- The left panel includes a DOM tree that syncs selection with the right panel and overlays, plus `Quick media` for nearby image/video/audio/background assets and metadata.
- Hovering an element in Guides mode shows full-edge dotted guides.
- `[TOOLS]` opens a submenu centered below the button with two sections: `Tools` (currently placeholder content) and `Custom tools`.
- Custom tools are toggled from the `[TOOLS]` submenu, and the same submenu includes a create/edit custom tools action.
- Multiple custom tools can be active at once; the `[TOOLS]` button shows the active count.
- Custom tools expose their lifecycle with `defineTool({ setup({ beforePageLoad }), cleanup() })`.
- `beforePageLoad` is `true` when setup runs while the document is still loading, otherwise `false`.
- The extension calls `cleanup()` when a tool is disabled and before setup reruns for the same tool.
- `On enable` tools are temporary for the current page session: they run once when toggled on, then are cleared on page navigation or extension restart.
- `On extension load` tools stay active in storage and rerun whenever the extension loads on a page.
- The background worker registers a persistent `USER_SCRIPT` bridge at `document_start`, and the content script sends setup/cleanup commands to that bridge over DOM events.
- Custom tool code is evaluated inside the `USER_SCRIPT` world instead of the page world, so strict page CSP rules do not block tool startup.
- If `userScripts` is unavailable when enabling a custom tool (missing optional permission, missing browser toggle, or unsupported browser state), activation opens the bundled custom tools editor so the user can follow the in-product guidance.
- A default example custom tool (`Center guides`) is prefilled for new installs; it draws 3px 50%-opacity vertical and horizontal center lines, updates on resize, and removes them in `cleanup()`.

## Custom Tools Editor
- The custom tools editor opens in a new extension tab.
- The editor uses the same mono HUD-inspired styling as the injected toolbar, with bracketed interactive controls, plain uppercase section headings, and border-only panels.
- The editor shows a full red permission banner whenever `userScripts` is unavailable; on Firefox builds the button requests the optional permission, and on Chrome builds it opens the extension’s `chrome://extensions` details page so the user can enable `Allow User Scripts`.
- Existing custom tools are listed at the top of the page; clicking `Edit` loads that tool into the editor below without creating a duplicate.
- Monaco editor provides JavaScript editing with formatting and validation actions.
- Validation checks syntax via parser tooling (not `eval` / `new Function`).
- The right-side panel documents the `defineTool` lifecycle API, the difference between `On enable` and `On extension load`, and cleanup expectations.
- The top action bar includes an `[AI PROMPT GUIDE]` modal with copy-ready instructions for generating tools that match the extension’s `defineTool` mount/lifecycle runtime.
