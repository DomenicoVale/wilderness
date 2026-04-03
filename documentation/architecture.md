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

## Inspect Tool
- Inspect runs in the content script and renders outlines/overlays plus right/left inspector panels into the page DOM.
- The panel edits selected element styles through inline style writes and supports collapse/expand behavior.

## Custom Tools
- Custom tools are stored in extension storage with an active tool set (`activeToolIds`).
- `lib/custom-tools/` groups the store, permission helpers, bridge runner, and background bridge service.
- The content script watches the custom tools store and keeps the current page in sync by calling tool setup/cleanup as active ids change.
- Custom tools expose `defineTool({ setup({ beforePageLoad }), cleanup() })`, letting the extension manage their lifecycle explicitly.
- `On enable` tools are ephemeral and are cleared on page navigation or extension restart.
- `On extension load` tools remain active in storage and rerun on every extension/page load.
- The background worker registers a persistent `USER_SCRIPT` bridge at `document_start`.
- The content script sends setup/cleanup commands to that bridge over DOM events, and the bridge hosts the per-page custom tool runtime/cleanup registry.
- The `USER_SCRIPT` world is exempt from the page CSP, so custom tools avoid page-level `unsafe-eval` failures while still running before or after page load depending on when the content script dispatches them.
- If the browser disables the `userScripts` API, enabling a custom tool opens the custom tools editor with guidance (and logs a warning) instead of falling back to a CSP-hostile `new Function` path.
- All active `On extension load` tools run automatically when the content script starts for enabled origins, and cleanup runs when a tool is disabled.

## Browser Support
- Chrome: MV3 (default build target)
- Firefox: MV3 128+ (`--mv3` flag in build scripts)
  - Firefox 128 is the minimum for `world: "MAIN"` in `registerContentScripts` (console interceptor)
  - Firefox declares `userScripts` as an optional permission and requests it from the bundled custom tools editor, because Firefox only surfaces the prompt from an extension-page user action

## Future Backend
We plan to add an Express.js backend later and will migrate to a monorepo layout when that work begins. Until then, the extension remains a single-package repo.
