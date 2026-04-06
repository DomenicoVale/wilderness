# Inspect Tool

## Purpose
Inspect is an inspector tool that surfaces and edits computed styles for a selected element.

## How It Works
- Hovering an element shows a hover outline.
- Clicking selects the element and opens details in the docked inspect panels.
- The right CSS panel is draggable from its top header row.
- A toggleable left panel sits on the left side, is independently draggable from its own header, and can expand up to viewport limits.
- Default panel layout uses at least `60vh` height with `16px` viewport offsets, plus fixed widths of `26rem` (tree panel) and `20rem` (right inspector).
- The top row shows the selector (`#id` when present, otherwise selector path) and copies it on click.
- Long selectors wrap in-place in the header (no horizontal overflow) while remaining copyable.
- Selector copy now shows a brief `Copied` tooltip and short strobe feedback on the selector button.
- When no element is selected, the right panel shows a `[RESTORE SAVED STATE]` action that reapplies all persisted inspect edits to the page at once.
- Both panels can be collapsed into compact 24×24 controls with labels and remain draggable while collapsed.
- Panel size/position/collapse state is persisted in extension storage and restored from one global layout shared across websites.
- On restore/resize, the left tree panel remains docked to the left and the right inspector remains docked to the right by default; both are clamped to the viewport to avoid overlap/off-screen states.
- Segment controls use icon-based affordances inspired by design-tool inspectors while keeping Wilderness styling.
- Escape clears the current selection.

## Settings
- Layout distance mode: when enabled, overlay labels show full whitespace distance between adjacent items; when disabled, overlays show only declared CSS flex/grid gap values.

## Shortcuts
- `i`: Toggle Inspect mode.
- `alt/command + hover`: Inspect the deepest element under the cursor.
- `esc`: Clear selection.

## Behavior
- Inspect blocks page mouse handlers while active.
- Inspect outlines and layout overlays use viewport-space positioning and refresh on scroll/resize so they stay attached to targets without causing page overflow.
- Inspect panel shells are rendered with React and mounted into page DOM with a portal, while overlay primitives stay DOM-driven for fast visual updates.
- Spacing overlays (margin/padding/gap) are only rendered while the selected target intersects the viewport.
- Gap overlays are rendered from dedicated gap logic and are positioned between adjacent item margin boxes (outside margins), matching browser DevTools behavior.
- In non-distance mode, gap overlays render only for positive declared CSS gaps (`row-gap`/`column-gap`) and do not represent extra spacing created by margins or alignment distribution.
- The right panel edits styles through inline style writes on the selected element.
- Editing controls preserve the inspect panel scroll position during rerenders (no jump-to-top while changing props).
- Numeric style inputs support keyboard stepping with `ArrowUp`/`ArrowDown`, preserving units and inferring sensible defaults when omitted. Hold `Shift` for coarse steps and `Ctrl/Cmd` for fine steps.
- Resetting a property via the trash action updates the property map before rerender so a single click reliably clears the value.
- Property controls include a `var` picker button before reset; it opens a searchable popup of scoped CSS custom properties, shows color chips for color-like variables, and applies `var(--token)` directly.
- Color swatches resolve scoped `var(...)` values so picker previews stay accurate instead of falling back to black.
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
- Panel layout persistence ignores hidden panel states, preventing min-size fallback writes during disable/re-enable cycles.
- Wheel input inside inspect panel containers is captured so panel scroll is prioritized over page scroll while hovering panel content, including `Shift + wheel` horizontal tree scrolling.
- Layout controls are context-aware: flex-only controls appear for flex containers, grid controls for grid containers, and axis labels clarify `justify-content` (main) vs `align-items` (cross).
- Flex/grid segmented controls use axis-aware icon sets so icon orientation and action mapping follow the current layout direction and writing mode.
- The `Layout` section is omitted entirely when the selected element is not a flex/grid container.
- `Transform` uses a tabbed editor (`Move`, `Scale`, `Rotate`, `Skew`) with axis sliders and numeric fields.

## Panel Implementation Notes
- `panel/shell.tsx` owns React state for selector text, copy pulse, status tooltip, and restore visibility.
- The shell exposes a small mount API (`setSelectorText`, `setStatus`, `setShowRestore`, action setters) so `panel/index.tsx` can stay focused on inspect orchestration logic.
- The `setRef` helper in `panel/shell.tsx` intentionally maps required shell nodes once during mount so imperative modules (drag/resize/tree/media hosts) can use stable references without repeated selectors.

## Relevant Files
- `entrypoints/content-ui/info/core/index.ts`: Public inspect exports (`createInfoController`, `InfoSettings`).
- `entrypoints/content-ui/info/core/controller.ts`: Inspect controller lifecycle, selection, overlays, and event wiring.
- `entrypoints/content-ui/info/core/types.ts`: Shared inspect types and public `InfoSettings` shape.
- `entrypoints/content-ui/info/core/options.ts`: Inspect constants, option lists, and segmented-control axis mappings.
- `entrypoints/content-ui/info/core/styles.ts`: Runtime style injector/composer (direct bundled imports from `styles/*.styles.css`).
- `entrypoints/content-ui/info/panel/shell.tsx`: React portal-mounted inspect panel shell (selector/status/restore UI and panel refs).
- `entrypoints/content-ui/info/panel/index.tsx`: Inspect panel orchestration and section rendering, delegating shell state updates through the React panel mount API.
- `entrypoints/content-ui/info/panel/layout.ts`: Panel drag/resize/collapse and persisted layout behavior.
- `entrypoints/content-ui/info/panel/controls.ts`: Property input controls, numeric drag/step logic, and transform editor.
- `entrypoints/content-ui/info/panel/tree-media.ts`: Panel-facing DOM tree/quick-media renderer adapter.
- `entrypoints/content-ui/info/panel/tree-media-renderer.ts`: DOM tree and quick-media rendering behavior.
- `entrypoints/content-ui/info/panel/state.ts`: In-memory/pending inspect style+text change tracking and application.
- `entrypoints/content-ui/info/panel/variables.tsx`: React CSS variable picker popover behavior.
- `entrypoints/content-ui/info/state/persistence.ts`: Persisted inspect state, panel layout, and tree expansion storage.
- `entrypoints/content-ui/info/utils/media.ts`: Quick-media discovery and media metadata helpers.
- `entrypoints/content-ui/info/utils/dom-tree.ts`: DOM tree traversal and labeling helpers.
- `entrypoints/content-ui/info/utils/transform.ts`: Transform parse/serialize helpers.
- `entrypoints/content-ui/info/utils/style.ts`: Color/style and CSS variable utility helpers.
- `entrypoints/content-ui/info/utils/common.ts`: Selector/style helper utilities.
- `entrypoints/content-ui/info/overlays/outline.ts`: Hover/selection outline DOM helpers and safe rect computation.
- `entrypoints/content-ui/info/overlays/layout.ts`: Margin/padding/element outline overlay orchestration.
- `entrypoints/content-ui/info/overlays/gap.ts`: Flex/grid gap overlay rendering and gap positioning rules.
- `entrypoints/content-ui/info/styles/*.styles.css`: Inspect panel and overlay CSS sources.
