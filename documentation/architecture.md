# Architecture

## Extension Runtime
- The Wilderness extension is built with WXT.
- The primary UI lives in a content script injected into the current page.
- The content UI is rendered inside a shadow root to avoid collisions with host page styles.

## Entry Points
- `entrypoints/content.tsx` mounts the content UI.
- `entrypoints/background.ts` provides thin orchestration for background listeners and delegates action-icon state rendering to `lib/background/action-indicator.ts`.
- No popup or options entrypoints are used for the initial product.
- Keep entrypoints thin and move reusable logic into `lib/` modules.

## Styling Pipeline
- React shadow-root UI styles are bundled from CSS files imported by `entrypoints/content.tsx` (`content-ui/style.css`, `content-ui/content-toolbar.css`, `content-ui/console/console-panel.css`) and injected via `cssInjectionMode: "ui"`.
- Page-DOM tool surfaces (Guides overlays + Inspect overlays/panels) load bundled CSS files at runtime through style managers (`guides/guides-styles.ts`, `info/core/styles.ts`) so selectors apply outside the shadow root.

## Activation
- The background script listens for the extension action click.
- Clicking the extension action toggles a single global enabled state for the extension.
- When enabled, the background script injects or re-enables the content UI on every supported HTTP(S) tab.
- `activeTab` permission allows click-to-inject even when site access is restricted.
- The enabled state persists across tab switches, reloads, and extension restarts.
- The content UI mounts after receiving the explicit enable/disable message.
- The action icon shows a green enabled indicator while active and an orange warning badge on unsupported or blocked pages.

## Guides Tool
- Guides runs in the content script and renders overlays into the page DOM.
- Overlays include selection boxes, hover gridlines, and distance measurements.

## Inspect Tool
- Inspect runs in the content script and renders outlines/overlays into the page DOM.
- Inspect right/left panels are rendered by React and mounted into the page DOM through a portal host in `panel/shell.tsx` (orchestrated by `panel/index.tsx`).
- Panel editing still writes inline styles on the selected element and supports collapse/expand behavior.
- `entrypoints/content-ui/info/core/index.ts` is the public inspect export surface, while `entrypoints/content-ui/info/{core,panel,overlays,state,utils,styles}` split controller wiring, panel rendering, overlays, persistence, and shared utilities.

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
- All active `On extension load` tools run automatically when the content script starts while the extension is enabled, and cleanup runs when a tool is disabled.

## Browser Support
- Chrome: MV3 (default build target)
- Firefox: MV3 128+ (`--mv3` flag in build scripts)
  - Firefox 128 is the minimum for `world: "MAIN"` in `registerContentScripts` (console interceptor)
  - Firefox declares `userScripts` as an optional permission and requests it from the bundled custom tools editor, because Firefox only surfaces the prompt from an extension-page user action

## Future Backend
We plan to add an Express.js backend later and will migrate to a monorepo layout when that work begins. Until then, the extension remains a single-package repo.
