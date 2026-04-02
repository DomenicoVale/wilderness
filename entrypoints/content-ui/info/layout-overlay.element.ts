export type LayoutOverlayHandle = {
  update: (element: Element, options?: LayoutOverlayOptions) => void;
  remove: () => void;
};

export type LayoutOverlayOptions = {
  showActualDistances?: boolean;
};

const getDocumentDimensions = () => {
  const body = document.body;
  const doc = document.documentElement;

  return {
    width: Math.max(
      window.innerWidth,
      body?.scrollWidth ?? 0,
      body?.offsetWidth ?? 0,
      doc?.scrollWidth ?? 0,
      doc?.offsetWidth ?? 0,
      doc?.clientWidth ?? 0
    ),
    height: Math.max(
      window.innerHeight,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
      doc?.scrollHeight ?? 0,
      doc?.offsetHeight ?? 0,
      doc?.clientHeight ?? 0
    ),
  };
};

const getViewportScroll = () => ({
  x: window.scrollX || window.pageXOffset || 0,
  y: window.scrollY || window.pageYOffset || 0,
});

const toNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

export const createLayoutOverlay = (): LayoutOverlayHandle => {
  const root = document.createElement("div");
  root.className = "wilderness-layout-overlay";
  root.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:2147483646;overflow:visible;";

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;";
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
    if (!isFlex && !isGrid) {
      return;
    }

    const dimensions = getDocumentDimensions();
    svg.setAttribute("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);
    svg.setAttribute("width", String(dimensions.width));
    svg.setAttribute("height", String(dimensions.height));

    const viewportScroll = getViewportScroll();
    const crViewport = element.getBoundingClientRect();
    const cr = {
      left: crViewport.left + viewportScroll.x,
      top: crViewport.top + viewportScroll.y,
      right: crViewport.right + viewportScroll.x,
      bottom: crViewport.bottom + viewportScroll.y,
      width: crViewport.width,
      height: crViewport.height,
    };
    const pt = parseFloat(cs.paddingTop) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const pl = parseFloat(cs.paddingLeft) || 0;

    rect(cr.left, cr.top, cr.width, cr.height, "none", "rgba(33,150,243,0.8)", 2, "4 3");

    const PAD = "rgba(255,165,0,0.15)";
    const PAD_S = "rgba(255,165,0,0.5)";
    if (pt > 0) {
      rect(cr.left + pl, cr.top, cr.width - pl - pr, pt, PAD, PAD_S, 1);
      label(String(Math.round(pt)), cr.left + cr.width / 2, cr.top + pt / 2);
    }
    if (pb > 0) {
      rect(cr.left + pl, cr.bottom - pb, cr.width - pl - pr, pb, PAD, PAD_S, 1);
      label(String(Math.round(pb)), cr.left + cr.width / 2, cr.bottom - pb / 2);
    }
    if (pl > 0) {
      rect(cr.left, cr.top, pl, cr.height, PAD, PAD_S, 1);
      label(String(Math.round(pl)), cr.left + pl / 2, cr.top + cr.height / 2);
    }
    if (pr > 0) {
      rect(cr.right - pr, cr.top, pr, cr.height, PAD, PAD_S, 1);
      label(String(Math.round(pr)), cr.right - pr / 2, cr.top + cr.height / 2);
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
          left: aViewport.left + viewportScroll.x,
          top: aViewport.top + viewportScroll.y,
          right: aViewport.right + viewportScroll.x,
          bottom: aViewport.bottom + viewportScroll.y,
        };
        const b = {
          left: bViewport.left + viewportScroll.x,
          top: bViewport.top + viewportScroll.y,
          right: bViewport.right + viewportScroll.x,
          bottom: bViewport.bottom + viewportScroll.y,
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
          left: childViewport.left + viewportScroll.x,
          top: childViewport.top + viewportScroll.y,
          right: childViewport.right + viewportScroll.x,
          bottom: childViewport.bottom + viewportScroll.y,
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
          rect(gapLeft, cr.top + pt, visualGap, cr.height - pt - pb, GAP, GAP_S, 1, "2 2");
          label(String(Math.round(visualGap)), gapLeft + visualGap / 2, cr.top + cr.height / 2);
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
          rect(cr.left + pl, gapTop, cr.width - pl - pr, visualGap, GAP, GAP_S, 1, "2 2");
          label(String(Math.round(visualGap)), cr.left + cr.width / 2, gapTop + visualGap / 2);
        }
      }
    }
  };

  return {
    update,
    remove: () => root.remove(),
  };
};
