import {
  type DeepTarget,
  getDeepTargetFromPoint,
  getElementForTarget,
  getTargetRect,
  isDeepPickEvent,
} from "../../../lib/deep-pick";
import { getPointerPopoverViewportPosition } from "../viewport-position";
import { ensureInfoStyles, removeInfoStyles } from "./info-styles";
import { createInfoTip, type InfoTipContent } from "./info-tip.element";
import { getStyles, isInfoUiElement, isOffBounds, observeRemoval, type StyleEntry } from "./info-utils";
import { createLayoutOverlay, type LayoutOverlayHandle } from "./layout-overlay.element";

const MOUSE_BLOCK_EVENTS: Array<keyof WindowEventMap> = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseover",
  "mouseout",
  "mouseenter",
  "mouseleave",
  "contextmenu",
];

const RESIZE_DEBOUNCE_MS = 120;
type InspectableWindow = Window & { inspect?: (target: Element) => void };
export type InfoSettings = {
  showTooltipOnClick: boolean;
  showActualLayoutDistances: boolean;
};

type ActiveState = {
  tip: ReturnType<typeof createInfoTip> | null;
  target: Element | null;
};

type InfoState = {
  enabled: boolean;
  active: ActiveState;
  pinned: Map<Element, ReturnType<typeof createInfoTip> | null>;
  layoutOverlays: Map<Element, LayoutOverlayHandle>;
  hoverTarget: Element | null;
  hoverDeepTarget: DeepTarget | null;
  pointer: { clientX: number; clientY: number } | null;
};

type PinnedOutlineState = {
  outline: HTMLDivElement;
  deepTarget: DeepTarget;
};

type StyleCacheEntry = {
  signature: string;
  styles: StyleEntry[];
};

const buildContent = (target: Element, styles: StyleEntry[]): InfoTipContent => {
  const rect = target.getBoundingClientRect();
  return {
    element: target,
    width: rect.width,
    height: rect.height,
    styles,
  };
};

const getViewportScroll = () => ({
  x: window.scrollX || window.pageXOffset || 0,
  y: window.scrollY || window.pageYOffset || 0,
});

const getTipPosition = (tip: ReturnType<typeof createInfoTip>, pointer: { clientX: number; clientY: number }) => {
  const tipRect = tip.root.getBoundingClientRect();
  const viewportPosition = getPointerPopoverViewportPosition({
    pointerX: pointer.clientX,
    pointerY: pointer.clientY,
    width: tipRect.width,
    height: tipRect.height,
  });
  const scroll = getViewportScroll();

  return {
    top: viewportPosition.top + scroll.y,
    left: viewportPosition.left + scroll.x,
  };
};

const isConnectedTarget = (target: DeepTarget) => {
  if (target instanceof Element) {
    return target.isConnected;
  }

  return target.commonAncestorContainer.isConnected;
};

export const createInfoController = () => {
  const settings: InfoSettings = {
    showTooltipOnClick: true,
    showActualLayoutDistances: true,
  };

  const state: InfoState = {
    enabled: false,
    active: {
      tip: null,
      target: null,
    },
    pinned: new Map(),
    layoutOverlays: new Map(),
    hoverTarget: null,
    hoverDeepTarget: null,
    pointer: null,
  };

  let styleCache = new WeakMap<Element, StyleCacheEntry>();

  const hoverOutline = document.createElement("div");
  hoverOutline.className = "wilderness-info-outline";
  hoverOutline.setAttribute("data-variant", "hover");
  hoverOutline.style.display = "none";
  const pinnedOutlines = new Map<Element, PinnedOutlineState>();
  const outlineParent = document.documentElement ?? document.body;
  if (!outlineParent) {
    console.warn("[Info] Unable to mount outlines: no document root.");
  } else {
    outlineParent.append(hoverOutline);
  }

  let resizeDebounceId: number | null = null;

  const getStyleSignature = (target: Element) => {
    const className = target.getAttribute("class") ?? "";
    const inlineStyle = target.getAttribute("style") ?? "";
    return `${className}::${inlineStyle}`;
  };

  const getCachedStyles = (target: Element): StyleEntry[] => {
    const signature = getStyleSignature(target);
    const cached = styleCache.get(target);
    if (cached && cached.signature === signature) {
      return cached.styles;
    }

    const styles = getStyles(target);
    styleCache.set(target, { signature, styles });
    return styles;
  };

  const buildContentForTarget = (target: Element) => buildContent(target, getCachedStyles(target));

  const getSafeRect = (target: DeepTarget, context: string) => {
    try {
      return getTargetRect(target, "document");
    } catch (error) {
      console.warn(`[Info] Unable to read ${context} bounds.`, error);
      return null;
    }
  };

  const showOutline = (outline: HTMLDivElement, rect: DOMRect) => {
    outline.style.left = `${rect.left}px`;
    outline.style.top = `${rect.top}px`;
    outline.style.width = `${rect.width}px`;
    outline.style.height = `${rect.height}px`;
    outline.style.display = "block";
  };

  const hideOutline = (outline: HTMLDivElement) => {
    outline.style.display = "none";
  };

  const clearActive = () => {
    if (state.active.tip) {
      state.active.tip.remove();
    }
    state.active.tip = null;
    state.active.target = null;
    state.hoverTarget = null;
    state.hoverDeepTarget = null;
    state.pointer = null;
    hideOutline(hoverOutline);
  };

  const unpinTarget = (target: Element) => {
    const tip = state.pinned.get(target);
    if (tip) {
      tip.remove();
    }
    state.pinned.delete(target);

    target.removeAttribute("data-wilderness-info");

    const overlay = state.layoutOverlays.get(target);
    if (overlay) {
      overlay.remove();
      state.layoutOverlays.delete(target);
    }

    const outlineState = pinnedOutlines.get(target);
    if (outlineState) {
      outlineState.outline.remove();
      pinnedOutlines.delete(target);
    }
  };

  const removePinned = () => {
    const targets = Array.from(state.pinned.keys());
    targets.forEach((target) => unpinTarget(target));
  };

  const removeAll = () => {
    clearActive();
    removePinned();
  };

  const showTip = (target: Element, pointer: { clientX: number; clientY: number }) => {
    if (!state.active.tip) {
      const tip = createInfoTip();
      tip.setContent(buildContentForTarget(target));
      tip.show();
      const { top, left } = getTipPosition(tip, pointer);
      tip.setPosition(left, top);

      state.active.tip = tip;
      state.active.target = target;
      return;
    }

    if (target === state.active.target) {
      const { top, left } = getTipPosition(state.active.tip, pointer);
      state.active.tip.setPosition(left, top);
      return;
    }

    state.active.tip.setContent(buildContentForTarget(target));
    const { top, left } = getTipPosition(state.active.tip, pointer);
    state.active.tip.setPosition(left, top);
    state.active.target = target;
  };

  const refreshPinnedVisuals = () => {
    const pinnedTargets = Array.from(state.pinned.keys());
    pinnedTargets.forEach((target) => {
      if (!target.isConnected) {
        console.warn("[Info] Removed a pinned target because it is no longer connected.");
        unpinTarget(target);
        return;
      }

      const tip = state.pinned.get(target);
      if (tip) {
        tip.setContent(buildContentForTarget(target));
      }

      const overlay = state.layoutOverlays.get(target);
      if (overlay) {
        overlay.update(target, { showActualDistances: settings.showActualLayoutDistances });
      }

      const outlineState = pinnedOutlines.get(target);
      if (!outlineState) {
        console.warn("[Info] Missing pinned outline state for a pinned target.");
        return;
      }

      if (!isConnectedTarget(outlineState.deepTarget)) {
        console.warn("[Info] Removed a pinned outline because its deep target is no longer connected.");
        unpinTarget(target);
        return;
      }

      const rect = getSafeRect(outlineState.deepTarget, "pinned outline");
      if (!rect) {
        unpinTarget(target);
        return;
      }

      showOutline(outlineState.outline, rect);
    });
  };

  const refreshOnResize = () => {
    if (state.hoverDeepTarget && isConnectedTarget(state.hoverDeepTarget)) {
      const rect = getSafeRect(state.hoverDeepTarget, "hover outline");
      if (rect) {
        showOutline(hoverOutline, rect);
      } else {
        hideOutline(hoverOutline);
      }
    } else {
      hideOutline(hoverOutline);
    }

    if (state.active.tip && state.active.target) {
      state.active.tip.setContent(buildContentForTarget(state.active.target));
      if (state.pointer) {
        const { top, left } = getTipPosition(state.active.tip, state.pointer);
        state.active.tip.setPosition(left, top);
      }
    }

    refreshPinnedVisuals();
  };

  const scheduleResizeRefresh = () => {
    if (resizeDebounceId !== null) {
      window.clearTimeout(resizeDebounceId);
    }

    resizeDebounceId = window.setTimeout(() => {
      resizeDebounceId = null;
      if (!state.enabled) {
        return;
      }

      // Responsive and media-query changes can alter computed styles.
      styleCache = new WeakMap<Element, StyleCacheEntry>();
      refreshOnResize();
    }, RESIZE_DEBOUNCE_MS);
  };

  const pinTip = (target: Element, event: MouseEvent, deepTarget: DeepTarget) => {
    if (state.pinned.has(target)) {
      return;
    }

    let tip: ReturnType<typeof createInfoTip> | null = null;
    if (settings.showTooltipOnClick) {
      const activeTip = state.active.tip;
      if (!activeTip || state.active.target !== target) {
        tip = createInfoTip();
        tip.setContent(buildContentForTarget(target));
        tip.show();
        const { top, left } = getTipPosition(tip, event);
        tip.setPosition(left, top);
      } else {
        tip = activeTip;
        state.active.tip = null;
        state.active.target = null;
      }

      tip.setPinned(true);
    }

    state.pinned.set(target, tip);
    const display = window.getComputedStyle(target).display;
    if (["flex", "inline-flex", "grid", "inline-grid"].includes(display)) {
      const overlay = createLayoutOverlay();
      overlay.update(target, { showActualDistances: settings.showActualLayoutDistances });
      state.layoutOverlays.set(target, overlay);
    }
    target.setAttribute("data-wilderness-info", "true");
    const outline = document.createElement("div");
    outline.className = "wilderness-info-outline";
    outline.setAttribute("data-variant", "pinned");
    outlineParent?.append(outline);
    pinnedOutlines.set(target, { outline, deepTarget });
    const rect = getSafeRect(deepTarget, "pinned target");
    if (rect) {
      showOutline(outline, rect);
    } else {
      hideOutline(outline);
    }
    observeRemoval(target, () => {
      if (!state.pinned.has(target)) {
        return;
      }
      unpinTarget(target);
    });
  };

  const handleMove = (event: Event) => {
    if (!state.enabled) {
      return;
    }

    if (!(event instanceof MouseEvent)) {
      return;
    }

    const target = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    const element = getElementForTarget(target);
    if (!element || !target || isOffBounds(target)) {
      clearActive();
      return;
    }

    showTip(element, event);
    state.hoverTarget = element;
    state.hoverDeepTarget = target;
    state.pointer = { clientX: event.clientX, clientY: event.clientY };
    const rect = getSafeRect(target, "hover target");
    if (rect) {
      showOutline(hoverOutline, rect);
      return;
    }

    hideOutline(hoverOutline);
  };

  const handleClick = (event: Event) => {
    if (!state.enabled) {
      return;
    }

    if (!(event instanceof MouseEvent)) {
      return;
    }

    const target = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    const element = getElementForTarget(target);
    if (!element || !target || isOffBounds(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!event.shiftKey) {
      removePinned();
    }

    pinTip(element, event, target);

    try {
      const inspectableWindow = window as InspectableWindow;
      if (typeof inspectableWindow.inspect === "function") {
        inspectableWindow.inspect(element);
      } else {
        console.log("[Wilderness] Element:", element);
      }
    } catch {
      console.log("[Wilderness] Element:", element);
    }
  };

  const handleMouseBlock = (event: Event) => {
    if (!state.enabled) {
      return;
    }

    if (!(event instanceof MouseEvent)) {
      return;
    }

    const target =
      event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;

    if (target && isInfoUiElement(target)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!state.enabled) {
      return;
    }

    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    removeAll();
  };

  const enable = () => {
    if (state.enabled) {
      return;
    }

    state.enabled = true;
    styleCache = new WeakMap<Element, StyleCacheEntry>();
    ensureInfoStyles();
    if (outlineParent && !outlineParent.contains(hoverOutline)) {
      outlineParent.append(hoverOutline);
    }

    window.addEventListener("mousemove", handleMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", scheduleResizeRefresh);
    MOUSE_BLOCK_EVENTS.forEach((type) => {
      window.addEventListener(type, handleMouseBlock, true);
    });
  };

  const disable = () => {
    if (!state.enabled) {
      return;
    }

    state.enabled = false;
    removeAll();
    state.layoutOverlays.forEach((overlay) => overlay.remove());
    state.layoutOverlays.clear();
    styleCache = new WeakMap<Element, StyleCacheEntry>();
    removeInfoStyles();
    hideOutline(hoverOutline);
    pinnedOutlines.forEach((outlineState) => outlineState.outline.remove());
    pinnedOutlines.clear();
    if (resizeDebounceId !== null) {
      window.clearTimeout(resizeDebounceId);
      resizeDebounceId = null;
    }

    window.removeEventListener("mousemove", handleMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("resize", scheduleResizeRefresh);
    MOUSE_BLOCK_EVENTS.forEach((type) => {
      window.removeEventListener(type, handleMouseBlock, true);
    });
  };

  const toggle = (next?: boolean) => {
    if (typeof next === "boolean") {
      if (next) {
        enable();
      } else {
        disable();
      }
      return state.enabled;
    }

    if (state.enabled) {
      disable();
    } else {
      enable();
    }

    return state.enabled;
  };

  return {
    enable,
    disable,
    toggle,
    updateSettings: (next: Partial<InfoSettings>) => {
      settings.showTooltipOnClick =
        typeof next.showTooltipOnClick === "boolean" ? next.showTooltipOnClick : settings.showTooltipOnClick;
      settings.showActualLayoutDistances =
        typeof next.showActualLayoutDistances === "boolean" ? next.showActualLayoutDistances : settings.showActualLayoutDistances;
      refreshPinnedVisuals();
    },
    isEnabled: () => state.enabled,
  };
};
