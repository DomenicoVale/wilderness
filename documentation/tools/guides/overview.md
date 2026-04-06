# Guides Tool

## Purpose
Guides is a ruler-style inspection tool for measuring element dimensions and distances, modeled after VisBug guides behavior.

## How It Works
- The toolbar toggles Guides on/off in the content script.
- Click an element to select it and render width/height labels.
- Hover another element to display edge-to-edge distance measurements.
- Hovering shows full-edge dotted gridlines extending to the window bounds.

## Shortcuts
- `g`: Toggle Guides mode.
- Hold Alt/Command while hovering or clicking to target the deepest text node.
- Press Escape to clear the selection and locked comparison.

## Settings
- Always show dimensions: keeps the selected element labels visible.

## Behavior
- Guides blocks page mouse handlers while active.
- Guide boxes, gridlines, and distance labels are mounted in document-space (`absolute`) so they stay attached to their targets while scrolling.
- Guides geometry is recalculated with a debounced `resize` handler instead of per-frame scroll updates.

## Relevant Files
- `entrypoints/content-ui/guides/guides-tool.ts`: Guides controller and event wiring.
- `entrypoints/content-ui/guides/measurements.ts`: Distance calculations.
- `entrypoints/content-ui/guides/guides-utils.ts`: Element picking and filtering.
- `entrypoints/content-ui/guides/guide-box.element.ts`: Selection and hover boxes.
- `entrypoints/content-ui/guides/distance.element.ts`: Distance line rendering.
- `entrypoints/content-ui/guides/gridlines.element.ts`: Full-edge gridlines.
- `entrypoints/content-ui/guides/guides-styles.ts`: Runtime style injector for Guides CSS.
- `entrypoints/content-ui/guides/guides.css`: Guides overlay style source.
