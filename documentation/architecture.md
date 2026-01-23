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
- The content UI mounts only after receiving the toggle message.

## Future Backend
We plan to add an Express.js backend later and will migrate to a monorepo layout when that work begins. Until then, the extension remains a single-package repo.
