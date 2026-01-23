# Guides Tool

## Purpose
Guides is a ruler-style inspection tool for measuring element dimensions and distances, modeled after VisBug guides behavior.

## How It Works
- The toolbar toggles Guides on/off in the content script.
- Click an element to select it and render width/height labels.
- Hover another element to display edge-to-edge distance measurements.
- Hovering shows full-edge dotted gridlines extending to the window bounds.

## Shortcuts
None yet.

## Relevant Files
- `entrypoints/content-ui/guides/guides_tool.ts`: Guides controller and event wiring.
- `entrypoints/content-ui/guides/measurements.ts`: Distance calculations.
- `entrypoints/content-ui/guides/guides_utils.ts`: Element picking and filtering.
- `entrypoints/content-ui/guides/guide_box.element.ts`: Selection and hover boxes.
- `entrypoints/content-ui/guides/distance.element.ts`: Distance line rendering.
- `entrypoints/content-ui/guides/gridlines.element.ts`: Full-edge gridlines.
- `entrypoints/content-ui/guides/guides_tool.ts`: Injected Guides styles.
