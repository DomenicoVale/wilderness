import { getDeepTargetFromPoint, getElementForTarget, getTargetRect, isDeepPickEvent } from "../../../lib/deep-pick";
import { ensureInfoStyles, removeInfoStyles } from "./info-styles";
import { createInfoTip, type InfoTipContent } from "./info-tip.element";
import { getStyles, isInfoUiElement, isOffBounds, observeRemoval } from "./info-utils";

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

type ActiveState = {
  tip: ReturnType<typeof createInfoTip> | null;
  target: Element | null;
};

type InfoState = {
  enabled: boolean;
  active: ActiveState;
  pinned: Map<Element, ReturnType<typeof createInfoTip>>;
  hoverTarget: Element | null;
};

const buildContent = (target: Element): InfoTipContent => {
  const rect = target.getBoundingClientRect();
  return {
    element: target,
    width: rect.width,
    height: rect.height,
    styles: getStyles(target),
  };
};

const getTipPosition = (tip: ReturnType<typeof createInfoTip>, event: MouseEvent) => {
  const tipRect = tip.root.getBoundingClientRect();
  const north = event.clientY > window.innerHeight / 2;
  const west = event.clientX > window.innerWidth / 2;
  const top = north ? event.clientY - tipRect.height - 20 : event.clientY + 24;
  const left = west ? event.clientX - tipRect.width + 20 : event.clientX - 20;

  return { top, left };
};

export const createInfoController = () => {
  const state: InfoState = {
    enabled: false,
    active: {
      tip: null,
      target: null,
    },
    pinned: new Map(),
    hoverTarget: null,
  };

  const hoverOutline = document.createElement("div");
  hoverOutline.className = "wilderness-info-outline";
  hoverOutline.setAttribute("data-variant", "hover");
  hoverOutline.style.display = "none";
  const pinnedOutlines = new Map<Element, HTMLDivElement>();
  const outlineParent = document.body ?? document.documentElement;
  if (!outlineParent) {
    console.warn("[Info] Unable to mount outlines: no document root.");
  } else {
    outlineParent.append(hoverOutline);
  }

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
    hideOutline(hoverOutline);
  };

  const removePinned = () => {
    state.pinned.forEach((tip, target) => {
      tip.remove();
      target.removeAttribute("data-wilderness-info");
    });
    state.pinned.clear();
    pinnedOutlines.forEach((outline) => outline.remove());
    pinnedOutlines.clear();
  };

  const removeAll = () => {
    clearActive();
    removePinned();
  };

  const showTip = (target: Element, event: MouseEvent) => {
    if (!state.active.tip) {
      const tip = createInfoTip();
      tip.setContent(buildContent(target));
      tip.show();
      const { top, left } = getTipPosition(tip, event);
      tip.setPosition(left, top);

      state.active.tip = tip;
      state.active.target = target;
      return;
    }

    if (target === state.active.target) {
      const { top, left } = getTipPosition(state.active.tip, event);
      state.active.tip.setPosition(left, top);
      return;
    }

    state.active.tip.setContent(buildContent(target));
    const { top, left } = getTipPosition(state.active.tip, event);
    state.active.tip.setPosition(left, top);
    state.active.target = target;
  };

  const pinTip = (target: Element, event: MouseEvent, deepTarget: Element | Range) => {
    if (state.pinned.has(target)) {
      return;
    }

    let tip = state.active.tip;
    if (!tip || state.active.target !== target) {
      tip = createInfoTip();
      tip.setContent(buildContent(target));
      tip.show();
      const { top, left } = getTipPosition(tip, event);
      tip.setPosition(left, top);
    } else {
      state.active.tip = null;
      state.active.target = null;
    }

    tip.setPinned(true);
    state.pinned.set(target, tip);
    target.setAttribute("data-wilderness-info", "true");
    const outline = document.createElement("div");
    outline.className = "wilderness-info-outline";
    outline.setAttribute("data-variant", "pinned");
    outlineParent?.append(outline);
    pinnedOutlines.set(target, outline);
    showOutline(outline, getTargetRect(deepTarget));
    observeRemoval(target, () => {
      const existing = state.pinned.get(target);
      if (!existing) {
        return;
      }
      existing.remove();
      state.pinned.delete(target);
      const existingOutline = pinnedOutlines.get(target);
      if (existingOutline) {
        existingOutline.remove();
        pinnedOutlines.delete(target);
      }
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
    showOutline(hoverOutline, getTargetRect(target));
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
    ensureInfoStyles();
    if (outlineParent && !outlineParent.contains(hoverOutline)) {
      outlineParent.append(hoverOutline);
    }

    window.addEventListener("mousemove", handleMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeydown);
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
    removeInfoStyles();
    hideOutline(hoverOutline);
    pinnedOutlines.forEach((outline) => outline.remove());
    pinnedOutlines.clear();

    window.removeEventListener("mousemove", handleMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("keydown", handleKeydown);
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
    isEnabled: () => state.enabled,
  };
};
