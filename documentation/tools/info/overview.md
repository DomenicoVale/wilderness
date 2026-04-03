# Inspect Tool

## Purpose
Inspect is an inspector tool that surfaces and edits computed styles for a selected element.

## How It Works
- Hovering an element shows a hover outline.
- Clicking selects the element and opens details in the docked inspect panels.
- The right CSS panel is draggable from its top header row.
- A toggleable left panel sits on the left side, is independently draggable from its own header, and can expand up to viewport limits.
- Default panel layout uses `~66vh` height with `16px` viewport offsets, plus fixed widths of `26rem` (tree panel) and `12rem` (right inspector).
- The top row shows the selector (`#id` when present, otherwise selector path) and copies it on click.
- Long selectors wrap in-place in the header (no horizontal overflow) while remaining copyable.
- Selector copy now shows a brief `Copied` tooltip and short strobe feedback on the selector button.
- When no element is selected, the right panel shows a `[RESTORE SAVED STATE]` action that reapplies all persisted inspect edits to the page at once.
- Both panels can be collapsed into compact 24×24 controls with labels and remain draggable while collapsed.
- Panel size/position/collapse state is persisted in extension storage and restored globally across websites.
- On restore/resize, the left tree panel remains docked to the left and the right inspector remains docked to the right by default; both are clamped to the viewport to avoid overlap/off-screen states.
- Segment controls use icon-based affordances inspired by design-tool inspectors while keeping Wilderness styling.
- Escape clears the current selection.

## Settings
- Layout distance mode: when enabled, overlay labels show full whitespace distance between items; when disabled, overlays show CSS grid/flex gap only.

## Shortcuts
- `i`: Toggle Inspect mode.
- `alt/command + hover`: Inspect the deepest element under the cursor.
- `esc`: Clear selection.

## Behavior
- Inspect blocks page mouse handlers while active.
- Inspect outlines and layout overlays use viewport-space positioning and refresh on scroll/resize so they stay attached to targets without causing page overflow.
- Spacing overlays (margin/padding/gap) are only rendered while the selected target intersects the viewport.
- The right panel edits styles through inline style writes on the selected element.
- Editing controls preserve the inspect panel scroll position during rerenders (no jump-to-top while changing props).
- Numeric style inputs support keyboard stepping with `ArrowUp`/`ArrowDown`, preserving units and inferring sensible defaults when omitted. Hold `Shift` for coarse steps and `Ctrl/Cmd` for fine steps.
- Resetting a property via the trash action updates the property map before rerender so a single click reliably clears the value.
- Inset matrix inputs (Top/Right/Bottom/Left for spacing) support horizontal drag-to-change from their edge labels, matching other numeric controls.
- Text/search inputs in the inspect panel auto-select all text on focus/click for fast replacement.
- Inspect panel text renders at `12px`; segmented control icons render at `15px`.
- `All CSS Props` is searchable and excludes properties already shown in the main sections.
- The left tree renders the page DOM tree (excluding non-UI tags like script/style/meta/link), keeps the selected path expanded, remains independently scrollable in both axes, and tree item controls expand to content width.
- Collapsing/expanding tree branches preserves current tree scroll position (no snap-back recenter), while explicit element selection still recenters the active tree row.
- Hovering a tree item highlights the corresponding element on the page.
- `Quick media` renders full-width previews (when previewable) with metadata (`Res`, `iRes`, URL) and independent scrolling.
- If no media exists on the selected element subtree, `Quick media` resolves the closest ancestor or nearby media element.
- Clicking a tree node or media select action smooth-scrolls the element into view before syncing the selection and overlays.
- Each media card includes its own `[SELECT]` action, and hovering a media card highlights the corresponding element on the page.
- Clicking a media item opens its URL in a new tab when a URL is available.
- Double-clicking page text starts inline text editing; committed text is tracked in inspect saved state and restored with saved state application.
- Color controls support both picker and free-form text in the same row: a small swatch on the left and a text field on the right for CSS variables/functions/named colors.
- Inspect style state now persists only style/text edits; panel layout persists only through inspect layout storage.
- Wheel input inside inspect panel containers is captured so panel scroll is prioritized over page scroll while hovering panel content, including `Shift + wheel` horizontal tree scrolling.
- Layout controls are context-aware: flex-only controls appear for flex containers, grid controls for grid containers, and axis labels clarify `justify-content` (main) vs `align-items` (cross).
- Flex justify/align segmented controls use direction-aware icon sets so icon orientation and action mapping follow the current flex-direction.
- The `Layout` section is omitted entirely when the selected element is not a flex/grid container.
- `Transform` uses a tabbed editor (`Move`, `Scale`, `Rotate`, `Skew`) with axis sliders and numeric fields.

## Relevant Files
- `entrypoints/content-ui/info/info-tool.ts`: Inspect controller, panel rendering, and event wiring.
- `entrypoints/content-ui/info/info-styles.ts`: Inspect panel and overlay styling.
- `entrypoints/content-ui/info/info-utils.ts`: Selector/style helper utilities.
