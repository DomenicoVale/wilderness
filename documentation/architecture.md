# Architecture

## Extension Runtime
- The Wilderness extension is built with WXT.
- The primary UI lives in a content script injected into the current page.
- The content UI is rendered inside a shadow root to avoid collisions with host page styles.

## Entry Points
- `entrypoints/content.tsx` mounts the content UI.
- `entrypoints/background.ts` is available for background logic as the feature set grows.
- No popup or options entrypoints are used for the initial product.

## Activation
- The background script listens for the extension action click.
- The content script is injected into the active tab on click.
- `activeTab` permission allows click-to-inject even when site access is restricted.
- Enabling the extension persists per-origin and re-injects on tab switches or reloads.
- The content UI mounts after receiving the explicit enable/disable message.
- Unsupported pages (non-HTTP(S) or blocked contexts) show an action badge warning.

## Guides Tool
- Guides runs in the content script and renders overlays into the page DOM.
- Overlays include selection boxes, hover gridlines, and distance measurements.

## Info Tool
- Info runs in the content script and renders inspection tips into the page DOM.
- Tips show computed styles and can be pinned per element.

## Custom Tools
- Custom tools are stored in extension storage with an active tool set (`activeToolIds`).
- Custom tools execute through the background worker using `browser.userScripts.execute`.
- Execution tries `MAIN` first, then falls back to `USER_SCRIPT` when needed.
- The fallback avoids page CSP `unsafe-eval` restrictions while keeping tool execution available.
- On browsers without `userScripts.execute`, execution falls back to `browser.scripting.executeScript` in `MAIN` world.
- All active on-load tools run automatically when the content script starts for enabled origins.

## Browser Support
- Chrome: MV3 (default build target)
- Firefox: MV3 128+ (`--mv3` flag in build scripts)
  - Firefox 128 is the minimum for `world: "MAIN"` in `registerContentScripts` (console interceptor)
  - Custom tool execution via `userScripts.execute()` requires Firefox 133+; earlier versions fall back to `scripting.executeScript`

## Future Backend
We plan to add an Express.js backend later and will migrate to a monorepo layout when that work begins. Until then, the extension remains a single-package repo.
