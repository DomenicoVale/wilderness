import $ from "jquery";
import { renderGaps } from "./gap";

export type LayoutOverlayHandle = {
  update: (element: Element, options?: LayoutOverlayOptions) => void;
  remove: () => void;
};

export type LayoutOverlayOptions = {
  showActualDistances?: boolean;
};

const getViewportRect = (): DOMRect => new DOMRect(0, 0, window.innerWidth, window.innerHeight);
const intersectsViewport = (rect: DOMRect, viewport: DOMRect) =>
  rect.right > viewport.left && rect.left < viewport.right && rect.bottom > viewport.top && rect.top < viewport.bottom;

/**
 * Creates margin/padding/element/gap overlay rendering for the current selected element.
 */
export const createLayoutOverlay = (): LayoutOverlayHandle => {
  const root = $("<div>")
    .addClass("wilderness-layout-overlay")
    .css({
      position: "fixed",
      left: "0",
      top: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "2147483646",
      overflow: "hidden",
    })
    .get(0);
  if (!(root instanceof HTMLDivElement)) {
    throw new Error("[Info] Unable to create layout overlay root.");
  }

  const NS = "http://www.w3.org/2000/svg";
  const svg = $(document.createElementNS(NS, "svg"))
    .css({
      position: "absolute",
      left: "0",
      top: "0",
      overflow: "hidden",
      maxWidth: "100%",
      maxHeight: "100%",
    })
    .get(0);
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error("[Info] Unable to create layout overlay svg root.");
  }
  $(root).append(svg);

  const parent = document.documentElement ?? document.body;
  if (!parent) {
    console.warn("[Info] Unable to mount layout overlay: no document root.");
  } else {
    $(parent).append(root);
  }

  const clear = () => {
    $(svg).empty();
  };

  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke?: string,
    strokeWidth = 1,
    dashArray?: string
  ) => {
    const r = document.createElementNS(NS, "rect");
    $(r).attr({
      x: String(x),
      y: String(y),
      width: String(Math.max(0, w)),
      height: String(Math.max(0, h)),
      fill,
    });
    if (stroke) {
      $(r).attr({
        stroke,
        "stroke-width": String(strokeWidth),
      });
    }
    if (dashArray) {
      $(r).attr("stroke-dasharray", dashArray);
    }
    $(svg).append(r);
    return r;
  };

  const label = (text: string, cx: number, cy: number) => {
    const g = document.createElementNS(NS, "g");
    const t = document.createElementNS(NS, "text");
    $(t)
      .attr({
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        x: String(cx),
        y: String(cy),
        fill: "#e0e0e0",
        "font-family": "'Courier New', Courier, monospace",
        "font-size": "10",
      })
      .text(text);
    const bgW = text.length * 6.5 + 6;
    const bgH = 14;
    const bg = document.createElementNS(NS, "rect");
    $(bg).attr({
      x: String(cx - bgW / 2),
      y: String(cy - bgH / 2),
      width: String(bgW),
      height: String(bgH),
      fill: "rgba(0,0,0,0.75)",
    });
    $(g).append(bg, t);
    $(svg).append(g);
  };

  const update = (element: Element, options: LayoutOverlayOptions = {}) => {
    clear();
    const showActualDistances = options.showActualDistances ?? true;
    const cs = window.getComputedStyle(element);

    const viewportRect = getViewportRect();
    const viewportWidth = Math.max(1, Math.round(window.innerWidth));
    const viewportHeight = Math.max(1, Math.round(window.innerHeight));
    $(svg).attr({
      viewBox: `0 0 ${viewportWidth} ${viewportHeight}`,
      width: String(viewportWidth),
      height: String(viewportHeight),
    });
    $(root).css({ width: "100vw", height: "100vh" });

    const elementRect = element.getBoundingClientRect();
    if (!intersectsViewport(elementRect, viewportRect)) {
      return;
    }
    const bounded = {
      left: elementRect.left,
      top: elementRect.top,
      right: elementRect.right,
      bottom: elementRect.bottom,
      width: Math.max(0, elementRect.width),
      height: Math.max(0, elementRect.height),
    };
    const pt = parseFloat(cs.paddingTop) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const pl = parseFloat(cs.paddingLeft) || 0;
    const mt = parseFloat(cs.marginTop) || 0;
    const mr = parseFloat(cs.marginRight) || 0;
    const mb = parseFloat(cs.marginBottom) || 0;
    const ml = parseFloat(cs.marginLeft) || 0;
    const marginBox = {
      left: bounded.left - ml,
      top: bounded.top - mt,
      right: bounded.right + mr,
      bottom: bounded.bottom + mb,
      width: bounded.width + ml + mr,
      height: bounded.height + mt + mb,
    };

    rect(bounded.left, bounded.top, bounded.width, bounded.height, "none", "rgba(33,150,243,0.8)", 2, "4 3");

    const PAD = "rgba(16,185,129,0.14)";
    const PAD_S = "rgba(16,185,129,0.55)";
    if (pt > 0) {
      rect(bounded.left + pl, bounded.top, bounded.width - pl - pr, pt, PAD, PAD_S, 1);
      label(String(Math.round(pt)), bounded.left + bounded.width / 2, bounded.top + pt / 2);
    }
    if (pb > 0) {
      rect(bounded.left + pl, bounded.bottom - pb, bounded.width - pl - pr, pb, PAD, PAD_S, 1);
      label(String(Math.round(pb)), bounded.left + bounded.width / 2, bounded.bottom - pb / 2);
    }
    if (pl > 0) {
      rect(bounded.left, bounded.top, pl, bounded.height, PAD, PAD_S, 1);
      label(String(Math.round(pl)), bounded.left + pl / 2, bounded.top + bounded.height / 2);
    }
    if (pr > 0) {
      rect(bounded.right - pr, bounded.top, pr, bounded.height, PAD, PAD_S, 1);
      label(String(Math.round(pr)), bounded.right - pr / 2, bounded.top + bounded.height / 2);
    }

    const MARGIN = "rgba(255,165,0,0.15)";
    const MARGIN_S = "rgba(255,165,0,0.5)";
    if (mt > 0) {
      rect(marginBox.left, marginBox.top, marginBox.width, mt, MARGIN, MARGIN_S, 1);
      label(String(Math.round(mt)), marginBox.left + marginBox.width / 2, marginBox.top + mt / 2);
    }
    if (mb > 0) {
      rect(marginBox.left, bounded.bottom, marginBox.width, mb, MARGIN, MARGIN_S, 1);
      label(String(Math.round(mb)), marginBox.left + marginBox.width / 2, bounded.bottom + mb / 2);
    }
    if (ml > 0) {
      rect(marginBox.left, marginBox.top + mt, ml, bounded.height, MARGIN, MARGIN_S, 1);
      label(String(Math.round(ml)), marginBox.left + ml / 2, marginBox.top + mt + bounded.height / 2);
    }
    if (mr > 0) {
      rect(bounded.right, marginBox.top + mt, mr, bounded.height, MARGIN, MARGIN_S, 1);
      label(String(Math.round(mr)), bounded.right + mr / 2, marginBox.top + mt + bounded.height / 2);
    }

    renderGaps({ rect, label }, element, cs, bounded, { top: pt, right: pr, bottom: pb, left: pl }, showActualDistances);
  };

  return {
    update,
    remove: () => root.remove(),
  };
};
