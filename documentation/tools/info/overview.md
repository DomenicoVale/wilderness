# Info Tool

## Purpose
Info is an inspector tool that surfaces the most relevant computed styles for a hovered element.

## How It Works
- Hovering an element shows a floating info card near the cursor.
- Clicking pins the info card for that element.
- Shift-click pins multiple elements at once.
- Escape clears all pinned cards.

## Shortcuts
- `i`: Toggle Info mode.
- `alt/command + hover`: Inspect the deepest element under the cursor.
- `shift + click`: Pin multiple elements.
- `esc`: Clear pinned tips.

## Behavior
- Info blocks page mouse handlers while active.

## Relevant Files
- `entrypoints/content-ui/info/info_tool.ts`: Info controller and event wiring.
- `entrypoints/content-ui/info/info_tip.element.ts`: Info tip DOM rendering.
- `entrypoints/content-ui/info/info_utils.ts`: Style extraction helpers.
