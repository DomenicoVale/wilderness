# Console Tool

## Purpose
The Console tool intercepts all console output (log, info, warn, error, debug) from the page and stores it for later viewing and export. This works even when DevTools are not open.

## How It Works
- The background script registers a MAIN world content script at `document_start`.
- The MAIN world script (`public/console-interceptor.js`) hooks all console methods.
- Intercepted logs are serialized safely (handling DOM elements, circular references, functions) and sent via `postMessage` to the content script.
- The content script stores logs in `console-store.ts`, which provides a pub/sub interface for React.
- The toolbar Console button toggles the panel visibility; interception is always active.

## Architecture
The console interceptor runs in the MAIN world (page context) to access the page's `console` object. Communication between worlds uses `window.postMessage` with a unique source identifier.

```
Page JS → console.log() → console-interceptor.ts (MAIN)
                               ↓ postMessage
                         content.tsx (ISOLATED)
                               ↓
                         console-store.ts
                               ↓
                         console-panel.tsx
```

## Shortcuts
- `c`: Toggle Console panel visibility.

## Features
- Real-time log capture with timestamps.
- Color-coded method types (log, info, warn, error, debug).
- Captures uncaught errors and unhandled promise rejections.
- Clear logs button.
- Download logs as JSON file.
- Text filter for log arguments.
- Auto-scroll that pauses when you scroll away from the bottom.
- Log count badge in toolbar.

## Console Entry Schema
Each log entry contains:
- `id`: Unique identifier.
- `method`: Console method used (log, info, warn, error, debug).
- `args`: Serialized arguments with type information.
- `timestamp`: Unix timestamp.
- `isUncaught`: True if from an uncaught error.
- `isUnhandledRejection`: True if from an unhandled promise rejection.

## Serialization
Arguments are serialized with type detection:
- Primitives: string, number, boolean, null, undefined, bigint, symbol.
- Functions: Stored as type with function name.
- DOM Elements: Stored with tagName, id, className.
- Objects/Arrays: JSON stringified with special value handling.
- Errors: Stored with message and stack trace.
- Circular references: Detected and marked.

## Relevant Files
- `public/console-interceptor.js`: MAIN world script that hooks console methods.
- `entrypoints/background.ts`: Registers the MAIN world interceptor on startup.
- `lib/console-store.ts`: Pub/sub store for console entries.
- `lib/events.ts`: Event constants including `TOGGLE_CONSOLE_EVENT`.
- `entrypoints/content.tsx`: Message listener for intercepted logs.
- `entrypoints/content-ui/tool-state.ts`: UI state including `consolePanelOpen`.
- `entrypoints/content-ui/console/console-panel.tsx`: Console panel UI component.
- `entrypoints/content-ui/content-toolbar.tsx`: Toolbar with Console button.
