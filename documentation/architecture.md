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
- Enabling the extension persists per-origin and re-injects on tab switches or reloads.
- The content UI mounts after receiving the explicit enable/disable message.

## Guides Tool
- Guides runs in the content script and renders overlays into the page DOM.
- Overlays include selection boxes, hover gridlines, and distance measurements.

## Info Tool
- Info runs in the content script and renders inspection tips into the page DOM.
- Tips show computed styles and can be pinned per element.

## Custom Tools
- Custom tools are stored in extension storage with an active tool selection.
- On-load tools run automatically when the content script starts for enabled origins.

## Future Backend
We plan to add an Express.js backend later and will migrate to a monorepo layout when that work begins. Until then, the extension remains a single-package repo.
