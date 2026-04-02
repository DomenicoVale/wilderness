# Info Tool

## Purpose
Info is an inspector tool that surfaces the most relevant computed styles for a hovered element.

## How It Works
- Hovering an element shows a floating info card to the right of the cursor, falling back left only when needed to stay inside the viewport.
- Clicking pins the info card for that element.
- Shift-click pins multiple elements at once.
- Escape clears all pinned cards.

## Settings
- Show tooltip on click: when disabled, clicking still pins outlines/layout overlays but does not create a pinned tooltip card.
- Layout distance mode: when enabled, overlay labels show full whitespace distance between items; when disabled, overlays show CSS grid/flex gap only.

## Shortcuts
- `i`: Toggle Info mode.
- `alt/command + hover`: Inspect the deepest element under the cursor.
- `shift + click`: Pin multiple elements.
- `esc`: Clear pinned tips.

## Behavior
- Info blocks page mouse handlers while active.
- Info outlines and flex/grid layout overlays use document-space (`absolute`) coordinates so they stay attached to targets while scrolling.
- Pinned/hover info geometry is recalculated with a debounced `resize` handler.

## Relevant Files
- `entrypoints/content-ui/info/info_tool.ts`: Info controller and event wiring.
- `entrypoints/content-ui/info/info_tip.element.ts`: Info tip DOM rendering.
- `entrypoints/content-ui/info/info_utils.ts`: Style extraction helpers.
