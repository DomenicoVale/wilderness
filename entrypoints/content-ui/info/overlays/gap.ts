import $ from "jquery";

/**
 * Gap overlay rendering for flex and grid containers.
 * Draws blue dashed rectangles representing CSS gaps between items,
 * positioned between item margin boxes (outside margins).
 */

export interface GapOverlayContext {
  rect: (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke?: string,
    strokeWidth?: number,
    dashArray?: string
  ) => void;
  label: (text: string, cx: number, cy: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SIMPLE_PIXEL_VALUE = /^-?\d*\.?\d+(px)?$/i;

function resolveLength(value: string, element: Element, property: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (SIMPLE_PIXEL_VALUE.test(trimmed)) return Number.parseFloat(trimmed) || 0;

  const probe = $("<div>")
    .css({
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
      width: 0,
      height: 0,
      margin: 0,
      padding: 0,
      border: 0,
    })
    .css(property, trimmed);
  const probeElement = probe.get(0);
  if (!(probeElement instanceof HTMLDivElement)) {
    return 0;
  }
  $(element).append(probeElement);
  const resolved = Number.parseFloat(window.getComputedStyle(probeElement).getPropertyValue(property)) || 0;
  probe.remove();
  return resolved;
}

function getMargin(style: CSSStyleDeclaration, side: string): number {
  return Number.parseFloat(style.getPropertyValue(`margin-${side}`)) || 0;
}

const GAP_FILL = "rgba(33,150,243,0.18)";
const GAP_STROKE = "rgba(33,150,243,0.6)";

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Render gap overlays for a flex or grid container.
 *
 * - `showActualDistances = true` → shows total whitespace between border boxes.
 * - `showActualDistances = false` → shows only the CSS gap, positioned between
 *   item margin boxes (never overlapping margin areas).
 */
export function renderGaps(
  ctx: GapOverlayContext,
  element: Element,
  containerStyle: CSSStyleDeclaration,
  bounded: { left: number; top: number; right: number; bottom: number; width: number; height: number },
  padding: { top: number; right: number; bottom: number; left: number },
  showActualDistances: boolean
): void {
  const display = containerStyle.display;
  const isFlex = display === "flex" || display === "inline-flex";
  const isGrid = display === "grid" || display === "inline-grid";
  if (!isFlex && !isGrid) return;

  const children = Array.from(element.children).filter((child) => {
    const s = window.getComputedStyle(child);
    if (s.display === "none") return false;
    // Out-of-flow children don't participate in flex/grid gap calculations
    const pos = s.position;
    if (pos === "absolute" || pos === "fixed") return false;
    // visibility:hidden children still occupy space in layout
    return true;
  });
  if (children.length < 2) return;

  if (isFlex) {
    renderFlexGaps(ctx, element, containerStyle, children, showActualDistances);
  } else {
    renderGridGaps(ctx, containerStyle, bounded, padding, children, showActualDistances);
  }
}

// ─── Core drawing ────────────────────────────────────────────────────────────

interface MarginBoxGapParams {
  /** End of current item border box (main-axis). */
  borderEnd: number;
  /** Start of next item border box (main-axis). */
  borderStart: number;
  /** Current item's margin toward the gap. */
  trailingMargin: number;
  /** Next item's margin toward the gap. */
  leadingMargin: number;
  /** CSS gap value from the container. */
  cssGap: number;
  /** Cross-axis start coordinate. */
  crossStart: number;
  /** Cross-axis size. */
  crossSize: number;
  /** true = main axis is horizontal. */
  horizontal: boolean;
}

/**
 * Draw a gap rectangle positioned between the margin boxes of two adjacent
 * items, centred within the safe render region.
 *
 * Only renders when CSS gap > 0 (non-actual mode never shows whitespace
 * caused purely by margins / justify-content / auto margins).
 */
function drawGapBetweenMarginBoxes(ctx: GapOverlayContext, p: MarginBoxGapParams): void {
  if (p.cssGap <= 0) return;

  const whitespace = p.borderStart - p.borderEnd;
  if (whitespace <= 0) return;

  // Intersect margin-box gap with visible whitespace (handles negative margins)
  const marginGapStart = p.borderEnd + p.trailingMargin;
  const marginGapEnd = p.borderStart - p.leadingMargin;
  const renderStart = Math.max(p.borderEnd, marginGapStart);
  const renderEnd = Math.min(p.borderStart, marginGapEnd);
  const renderSpace = renderEnd - renderStart;
  if (renderSpace <= 0) return;

  const visualGap = Math.min(renderSpace, p.cssGap);
  if (visualGap <= 0) return;

  // Centre within the safe render region
  const gapPos = renderStart + (renderSpace - visualGap) / 2;

  if (p.horizontal) {
    ctx.rect(gapPos, p.crossStart, visualGap, p.crossSize, GAP_FILL, GAP_STROKE, 1, "2 2");
    ctx.label(String(Math.round(visualGap)), gapPos + visualGap / 2, p.crossStart + p.crossSize / 2);
  } else {
    ctx.rect(p.crossStart, gapPos, p.crossSize, visualGap, GAP_FILL, GAP_STROKE, 1, "2 2");
    ctx.label(String(Math.round(visualGap)), p.crossStart + p.crossSize / 2, gapPos + visualGap / 2);
  }
}

/** Draw a full-whitespace gap rectangle (used when showActualDistances is on). */
function drawFullWhitespace(
  ctx: GapOverlayContext,
  mainStart: number,
  mainSize: number,
  crossStart: number,
  crossSize: number,
  horizontal: boolean
): void {
  if (horizontal) {
    ctx.rect(mainStart, crossStart, mainSize, crossSize, GAP_FILL, GAP_STROKE, 1, "2 2");
    ctx.label(String(Math.round(mainSize)), mainStart + mainSize / 2, crossStart + crossSize / 2);
  } else {
    ctx.rect(crossStart, mainStart, crossSize, mainSize, GAP_FILL, GAP_STROKE, 1, "2 2");
    ctx.label(String(Math.round(mainSize)), crossStart + crossSize / 2, mainStart + mainSize / 2);
  }
}

// ─── Flex ────────────────────────────────────────────────────────────────────

function renderFlexGaps(
  ctx: GapOverlayContext,
  container: Element,
  cs: CSSStyleDeclaration,
  children: Element[],
  showActualDistances: boolean
): void {
  const direction = cs.flexDirection;
  const isRow = direction === "row" || direction === "row-reverse";
  const cssGap = resolveLength(isRow ? cs.columnGap : cs.rowGap, container, isRow ? "column-gap" : "row-gap");

  const items = children
    .map((child) => ({
      element: child,
      style: window.getComputedStyle(child),
      rect: child.getBoundingClientRect(),
    }))
    .sort((a, b) => (isRow ? a.rect.left - b.rect.left || a.rect.top - b.rect.top : a.rect.top - b.rect.top));

  for (let i = 0; i < items.length - 1; i++) {
    const curr = items[i];
    const next = items[i + 1];

    const borderEnd = isRow ? curr.rect.right : curr.rect.bottom;
    const borderStart = isRow ? next.rect.left : next.rect.top;
    const whitespace = borderStart - borderEnd;
    if (whitespace <= 0) continue;

    const crossStart = isRow ? Math.min(curr.rect.top, next.rect.top) : Math.min(curr.rect.left, next.rect.left);
    const crossEnd = isRow ? Math.max(curr.rect.bottom, next.rect.bottom) : Math.max(curr.rect.right, next.rect.right);
    const crossSize = crossEnd - crossStart;

    if (showActualDistances) {
      drawFullWhitespace(ctx, borderEnd, whitespace, crossStart, crossSize, isRow);
      continue;
    }

    const trailingMargin = isRow
      ? resolveLength(curr.style.marginRight, curr.element, "margin-right")
      : resolveLength(curr.style.marginBottom, curr.element, "margin-bottom");
    const leadingMargin = isRow
      ? resolveLength(next.style.marginLeft, next.element, "margin-left")
      : resolveLength(next.style.marginTop, next.element, "margin-top");

    drawGapBetweenMarginBoxes(ctx, {
      borderEnd,
      borderStart,
      trailingMargin,
      leadingMargin,
      cssGap,
      crossStart,
      crossSize,
      horizontal: isRow,
    });
  }
}

// ─── Grid ────────────────────────────────────────────────────────────────────

interface GridItem {
  style: CSSStyleDeclaration;
  rect: DOMRect;
}

function renderGridGaps(
  ctx: GapOverlayContext,
  cs: CSSStyleDeclaration,
  bounded: { left: number; top: number; right: number; bottom: number; width: number; height: number },
  padding: { top: number; right: number; bottom: number; left: number },
  children: Element[],
  showActualDistances: boolean
): void {
  const columnGap = Number.parseFloat(cs.columnGap) || 0;
  const rowGap = Number.parseFloat(cs.rowGap) || 0;

  const items: GridItem[] = children.map((child) => ({
    style: window.getComputedStyle(child),
    rect: child.getBoundingClientRect(),
  }));

  const contentTop = bounded.top + padding.top;
  const contentHeight = bounded.height - padding.top - padding.bottom;
  const contentLeft = bounded.left + padding.left;
  const contentWidth = bounded.width - padding.left - padding.right;

  renderGridAxisGaps(ctx, items, {
    edgeFn: (it) => Math.round(it.rect.right),
    startFn: (it) => Math.round(it.rect.left),
    trailingMarginFn: (it) => getMargin(it.style, "right"),
    leadingMarginFn: (it) => getMargin(it.style, "left"),
    cssGap: columnGap,
    crossStart: contentTop,
    crossSize: contentHeight,
    horizontal: true,
    showActualDistances,
  });

  renderGridAxisGaps(ctx, items, {
    edgeFn: (it) => Math.round(it.rect.bottom),
    startFn: (it) => Math.round(it.rect.top),
    trailingMarginFn: (it) => getMargin(it.style, "bottom"),
    leadingMarginFn: (it) => getMargin(it.style, "top"),
    cssGap: rowGap,
    crossStart: contentLeft,
    crossSize: contentWidth,
    horizontal: false,
    showActualDistances,
  });
}

interface GridAxisParams {
  edgeFn: (it: GridItem) => number;
  startFn: (it: GridItem) => number;
  trailingMarginFn: (it: GridItem) => number;
  leadingMarginFn: (it: GridItem) => number;
  cssGap: number;
  crossStart: number;
  crossSize: number;
  horizontal: boolean;
  showActualDistances: boolean;
}

function renderGridAxisGaps(ctx: GapOverlayContext, items: GridItem[], p: GridAxisParams): void {
  const edges = [...new Set(items.map(p.edgeFn))].sort((a, b) => a - b);

  for (const edge of edges) {
    const nextStarts = items.map(p.startFn).filter((v) => v > edge);
    if (nextStarts.length === 0) continue;
    const nextEdge = Math.min(...nextStarts);
    const whitespace = nextEdge - edge;
    if (whitespace <= 0) continue;

    if (p.showActualDistances) {
      drawFullWhitespace(ctx, edge, whitespace, p.crossStart, p.crossSize, p.horizontal);
      continue;
    }

    // Find items bordering this gap to determine margins
    const trailingItems = items.filter((it) => p.edgeFn(it) === edge);
    const leadingItems = items.filter((it) => p.startFn(it) === nextEdge);
    const maxTrailingMargin = Math.max(0, ...trailingItems.map(p.trailingMarginFn));
    const maxLeadingMargin = Math.max(0, ...leadingItems.map(p.leadingMarginFn));

    drawGapBetweenMarginBoxes(ctx, {
      borderEnd: edge,
      borderStart: nextEdge,
      trailingMargin: maxTrailingMargin,
      leadingMargin: maxLeadingMargin,
      cssGap: p.cssGap,
      crossStart: p.crossStart,
      crossSize: p.crossSize,
      horizontal: p.horizontal,
    });
  }
}
