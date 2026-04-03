export type LayoutOverlayHandle = {
  update: (element: Element, options?: LayoutOverlayOptions) => void;
  remove: () => void;
};

export type LayoutOverlayOptions = {
  showActualDistances?: boolean;
};

const toNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const getViewportRect = (): DOMRect => new DOMRect(0, 0, window.innerWidth, window.innerHeight);
const intersectsViewport = (rect: DOMRect, viewport: DOMRect) =>
  rect.right > viewport.left && rect.left < viewport.right && rect.bottom > viewport.top && rect.top < viewport.bottom;

export const createLayoutOverlay = (): LayoutOverlayHandle => {
  const root = document.createElement("div");
  root.className = "wilderness-layout-overlay";
  root.style.cssText =
    "position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646;overflow:hidden;";

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.style.cssText = "position:absolute;left:0;top:0;overflow:hidden;max-width:100%;max-height:100%;";
  root.appendChild(svg);

  const parent = document.documentElement ?? document.body;
  if (!parent) {
    console.warn("[Info] Unable to mount layout overlay: no document root.");
  } else {
    parent.appendChild(root);
  }

  const clear = () => {
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
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
    r.setAttribute("x", String(x));
    r.setAttribute("y", String(y));
    r.setAttribute("width", String(Math.max(0, w)));
    r.setAttribute("height", String(Math.max(0, h)));
    r.setAttribute("fill", fill);
    if (stroke) {
      r.setAttribute("stroke", stroke);
      r.setAttribute("stroke-width", String(strokeWidth));
    }
    if (dashArray) {
      r.setAttribute("stroke-dasharray", dashArray);
    }
    svg.appendChild(r);
    return r;
  };

  const label = (text: string, cx: number, cy: number) => {
    const g = document.createElementNS(NS, "g");
    const t = document.createElementNS(NS, "text");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.setAttribute("x", String(cx));
    t.setAttribute("y", String(cy));
    t.setAttribute("fill", "#e0e0e0");
    t.setAttribute("font-family", "'Courier New', Courier, monospace");
    t.setAttribute("font-size", "10");
    t.textContent = text;
    const bgW = text.length * 6.5 + 6;
    const bgH = 14;
    const bg = document.createElementNS(NS, "rect");
    bg.setAttribute("x", String(cx - bgW / 2));
    bg.setAttribute("y", String(cy - bgH / 2));
    bg.setAttribute("width", String(bgW));
    bg.setAttribute("height", String(bgH));
    bg.setAttribute("fill", "rgba(0,0,0,0.75)");
    g.appendChild(bg);
    g.appendChild(t);
    svg.appendChild(g);
  };

  const update = (element: Element, options: LayoutOverlayOptions = {}) => {
    clear();
    const showActualDistances = options.showActualDistances ?? true;
    const cs = window.getComputedStyle(element);
    const display = cs.display;
    const isFlex = display === "flex" || display === "inline-flex";
    const isGrid = display === "grid" || display === "inline-grid";

    const viewportRect = getViewportRect();
    const viewportWidth = Math.max(1, Math.round(window.innerWidth));
    const viewportHeight = Math.max(1, Math.round(window.innerHeight));
    svg.setAttribute("viewBox", `0 0 ${viewportWidth} ${viewportHeight}`);
    svg.setAttribute("width", String(viewportWidth));
    svg.setAttribute("height", String(viewportHeight));
    root.style.width = "100vw";
    root.style.height = "100vh";

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

    const PAD = "rgba(255,165,0,0.15)";
    const PAD_S = "rgba(255,165,0,0.5)";
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

    const MARGIN = "rgba(16,185,129,0.14)";
    const MARGIN_S = "rgba(16,185,129,0.55)";
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

    if (!isFlex && !isGrid) {
      return;
    }

    const children = Array.from(element.children).filter((child) => {
      const childStyle = window.getComputedStyle(child as Element);
      return childStyle.display !== "none" && childStyle.visibility !== "hidden" && (child as HTMLElement).offsetParent !== null;
    }) as Element[];

    if (children.length < 2) {
      return;
    }

    const GAP = "rgba(33,150,243,0.18)";
    const GAP_S = "rgba(33,150,243,0.6)";

    if (isFlex) {
      const direction = cs.flexDirection;
      const isRow = direction === "row" || direction === "row-reverse";
      const flexGap = toNumber(isRow ? cs.columnGap : cs.rowGap);
      for (let index = 0; index < children.length - 1; index++) {
        const aStyle = window.getComputedStyle(children[index]);
        const bStyle = window.getComputedStyle(children[index + 1]);
        const aViewport = children[index].getBoundingClientRect();
        const bViewport = children[index + 1].getBoundingClientRect();
        const a = {
          left: aViewport.left,
          top: aViewport.top,
          right: aViewport.right,
          bottom: aViewport.bottom,
        };
        const b = {
          left: bViewport.left,
          top: bViewport.top,
          right: bViewport.right,
          bottom: bViewport.bottom,
        };
        if (isRow) {
          const x1 = Math.min(a.right, b.right);
          const x2 = Math.max(a.right, b.left);
          if (x2 > x1) {
            const whitespace = x2 - x1;
            const marginContribution = (toNumber(aStyle.marginRight) ?? 0) + (toNumber(bStyle.marginLeft) ?? 0);
            const visualGap = showActualDistances
              ? whitespace
              : flexGap !== null
                ? Math.min(whitespace, Math.max(0, flexGap))
                : Math.max(0, whitespace - marginContribution);
            if (visualGap <= 0) {
              continue;
            }
            const gapLeft = x1 + (whitespace - visualGap) / 2;
            const top = Math.min(a.top, b.top);
            const height = Math.max(a.bottom, b.bottom) - top;
            rect(gapLeft, top, visualGap, height, GAP, GAP_S, 1, "2 2");
            label(String(Math.round(visualGap)), gapLeft + visualGap / 2, top + height / 2);
          }
        } else {
          const y1 = Math.min(a.bottom, b.bottom);
          const y2 = Math.max(a.bottom, b.top);
          if (y2 > y1) {
            const whitespace = y2 - y1;
            const marginContribution = (toNumber(aStyle.marginBottom) ?? 0) + (toNumber(bStyle.marginTop) ?? 0);
            const visualGap = showActualDistances
              ? whitespace
              : flexGap !== null
                ? Math.min(whitespace, Math.max(0, flexGap))
                : Math.max(0, whitespace - marginContribution);
            if (visualGap <= 0) {
              continue;
            }
            const gapTop = y1 + (whitespace - visualGap) / 2;
            const left = Math.min(a.left, b.left);
            const width = Math.max(a.right, b.right) - left;
            rect(left, gapTop, width, visualGap, GAP, GAP_S, 1, "2 2");
            label(String(Math.round(visualGap)), left + width / 2, gapTop + visualGap / 2);
          }
        }
      }
    } else {
      const columnGap = toNumber(cs.columnGap);
      const rowGap = toNumber(cs.rowGap);
      const childRects = children.map((child) => {
        const childViewport = child.getBoundingClientRect();
        return {
          left: childViewport.left,
          top: childViewport.top,
          right: childViewport.right,
          bottom: childViewport.bottom,
        };
      });
      const xs = [...new Set(childRects.map((childRect) => Math.round(childRect.right)))].sort((a, b) => a - b);
      const ys = [...new Set(childRects.map((childRect) => Math.round(childRect.bottom)))].sort((a, b) => a - b);

      for (let index = 0; index < xs.length - 1; index++) {
        const x1 = xs[index];
        const x2Candidates = childRects.map((childRect) => Math.round(childRect.left)).filter((x) => x > x1);
        if (x2Candidates.length === 0) {
          continue;
        }
        const x2 = Math.min(...x2Candidates);
        if (x2 > x1) {
          const whitespace = x2 - x1;
          const visualGap = showActualDistances
            ? whitespace
            : columnGap !== null
              ? Math.min(whitespace, Math.max(0, columnGap))
              : whitespace;
          if (visualGap <= 0) {
            continue;
          }
          const gapLeft = x1 + (whitespace - visualGap) / 2;
          rect(gapLeft, bounded.top + pt, visualGap, bounded.height - pt - pb, GAP, GAP_S, 1, "2 2");
          label(String(Math.round(visualGap)), gapLeft + visualGap / 2, bounded.top + bounded.height / 2);
        }
      }

      for (let index = 0; index < ys.length - 1; index++) {
        const y1 = ys[index];
        const y2Candidates = childRects.map((childRect) => Math.round(childRect.top)).filter((y) => y > y1);
        if (y2Candidates.length === 0) {
          continue;
        }
        const y2 = Math.min(...y2Candidates);
        if (y2 > y1) {
          const whitespace = y2 - y1;
          const visualGap = showActualDistances
            ? whitespace
            : rowGap !== null
              ? Math.min(whitespace, Math.max(0, rowGap))
              : whitespace;
          if (visualGap <= 0) {
            continue;
          }
          const gapTop = y1 + (whitespace - visualGap) / 2;
          rect(bounded.left + pl, gapTop, bounded.width - pl - pr, visualGap, GAP, GAP_S, 1, "2 2");
          label(String(Math.round(visualGap)), bounded.left + bounded.width / 2, gapTop + visualGap / 2);
        }
      }
    }
  };

  return {
    update,
    remove: () => root.remove(),
  };
};
