import { getDeepTargetFromPoint, isDeepPickEvent } from "../../../lib/deep-pick";
import type { DistanceHandle } from "./distance.element";
import { createGridlines } from "./gridlines.element";
import { createGuideBox } from "./guide-box.element";
import { ensureGuidesRoot, ensureGuidesStyles, removeGuidesRoot, removeGuidesStyles } from "./guides-styles";
import { getTargetRect, isGuidesUiElement, isOffBounds } from "./guides-utils";
import { clearMeasurements, createMeasurements } from "./measurements";

type GuidesState = {
  enabled: boolean;
  selected: Element | Range | null;
  hovered: Element | Range | null;
  lockedTarget: Element | Range | null;
};

export type GuidesSettings = {
  alwaysShowDimensions: boolean;
  keepPairDistances: boolean;
};

type FrozenPair = {
  selectedTarget: Element | Range;
  lockedTarget: Element | Range;
  selectedBox: ReturnType<typeof createGuideBox>;
  lockedBox: ReturnType<typeof createGuideBox>;
  gridlines: ReturnType<typeof createGridlines>;
  distances: DistanceHandle[];
  color: string;
};

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

const isTargetConnected = (target: Element | Range) => {
  if (target instanceof Element) {
    return target.isConnected;
  }

  return target.commonAncestorContainer.isConnected;
};

export const createGuidesController = () => {
  const state: GuidesState = {
    enabled: false,
    selected: null,
    hovered: null,
    lockedTarget: null,
  };

  const settings: GuidesSettings = {
    alwaysShowDimensions: false,
    keepPairDistances: true,
  };
  const PAIR_COLORS = ["#8b5cf6", "#ef4444", "#f59e0b", "#06b6d4", "#10b981", "#f97316", "#ec4899", "#6366f1"];
  let pairColorIndex = 0;
  const nextColor = () => {
    const c = PAIR_COLORS[pairColorIndex % PAIR_COLORS.length];
    if (!c) {
      console.warn("[Guides] Unable to resolve a pair color, using fallback.");
      return "#8b5cf6";
    }
    pairColorIndex++;
    return c;
  };

  let selectedBox: ReturnType<typeof createGuideBox> | null = null;
  let hoverBox: ReturnType<typeof createGuideBox> | null = null;
  let lockedBox: ReturnType<typeof createGuideBox> | null = null;
  let gridlines: ReturnType<typeof createGridlines> | null = null;
  let frozenPairs: FrozenPair[] = [];
  let activeDistances: DistanceHandle[] = [];
  let resizeDebounceId: number | null = null;
  let guidesRoot: HTMLElement | null = null;

  const clearActiveMeasurements = () => {
    if (!activeDistances.length) {
      return;
    }

    clearMeasurements(activeDistances);
    activeDistances = [];
  };

  const applyPairLabelSides = (
    selectedRect: DOMRect,
    lockedRect: DOMRect,
    selectedHandle: ReturnType<typeof createGuideBox>,
    lockedHandle: ReturnType<typeof createGuideBox>
  ) => {
    if (lockedRect.top >= selectedRect.bottom || lockedRect.top > selectedRect.top) {
      selectedHandle.setLabelSide("top", "left");
      lockedHandle.setLabelSide("bottom", "right");
      return;
    }

    selectedHandle.setLabelSide("bottom", "right");
    lockedHandle.setLabelSide("top", "left");
  };

  const getSafeRect = (target: Element | Range, context: string): DOMRect | null => {
    try {
      return getTargetRect(target);
    } catch (error) {
      console.warn(`[Guides] Unable to read ${context} bounds.`, error);
      return null;
    }
  };

  const replaceActiveMeasurements = (anchor: Element | Range, target: Element | Range) => {
    clearActiveMeasurements();
    activeDistances = createMeasurements(anchor, target, guidesRoot ?? undefined);
  };

  const removeFrozenPair = (pair: FrozenPair) => {
    pair.selectedBox.remove();
    pair.lockedBox.remove();
    pair.gridlines.remove();
    clearMeasurements(pair.distances);
  };

  const refreshFrozenPairs = () => {
    const nextPairs: FrozenPair[] = [];

    frozenPairs.forEach((pair) => {
      if (!isTargetConnected(pair.selectedTarget) || !isTargetConnected(pair.lockedTarget)) {
        console.warn("[Guides] Removed a frozen pair because one of its targets is no longer connected.");
        removeFrozenPair(pair);
        return;
      }

      const selectedRect = getSafeRect(pair.selectedTarget, "frozen selected target");
      const lockedRect = getSafeRect(pair.lockedTarget, "frozen locked target");
      if (!selectedRect || !lockedRect) {
        removeFrozenPair(pair);
        return;
      }

      pair.selectedBox.setRect(selectedRect);
      pair.lockedBox.setRect(lockedRect);
      pair.selectedBox.setLabelsVisible(settings.alwaysShowDimensions);
      pair.lockedBox.setLabelsVisible(settings.alwaysShowDimensions);
      pair.selectedBox.show();
      pair.lockedBox.show();
      pair.gridlines.update(lockedRect);
      pair.gridlines.show();
      applyPairLabelSides(selectedRect, lockedRect, pair.selectedBox, pair.lockedBox);

      clearMeasurements(pair.distances);
      pair.distances = createMeasurements(pair.selectedTarget, pair.lockedTarget, guidesRoot ?? undefined);
      pair.distances.forEach((distance) => {
        distance.setColor(pair.color);
        distance.setVisible(settings.keepPairDistances);
      });

      nextPairs.push(pair);
    });

    frozenPairs = nextPairs;
  };

  const ensureBoxes = () => {
    if (!selectedBox) {
      selectedBox = createGuideBox("selected", guidesRoot ?? undefined);
    }

    if (!hoverBox) {
      hoverBox = createGuideBox("hover", guidesRoot ?? undefined);
    }

    if (!lockedBox) {
      lockedBox = createGuideBox("locked", guidesRoot ?? undefined);
    }

    if (!gridlines) {
      gridlines = createGridlines(guidesRoot ?? undefined);
    }
  };

  const freezeCurrentPair = () => {
    if (selectedBox && lockedBox && gridlines && state.selected && state.lockedTarget) {
      const color = nextColor();
      selectedBox.setColor(color);
      lockedBox.setColor(color);
      activeDistances.forEach((distance) => {
        distance.setColor(color);
        distance.setVisible(settings.keepPairDistances);
      });

      frozenPairs.push({
        selectedTarget: state.selected,
        lockedTarget: state.lockedTarget,
        selectedBox,
        lockedBox,
        gridlines,
        distances: activeDistances,
        color,
      });
      activeDistances = [];
    } else {
      console.warn("[Guides] Unable to freeze pair because the selection is incomplete.");
      clearActiveMeasurements();
    }

    selectedBox = createGuideBox("selected", guidesRoot ?? undefined);
    lockedBox = createGuideBox("locked", guidesRoot ?? undefined);
    gridlines = createGridlines(guidesRoot ?? undefined);
    state.selected = null;
    state.lockedTarget = null;
  };

  const updateLockedTarget = (next: Element | Range | null) => {
    if (!lockedBox) {
      return;
    }

    state.lockedTarget = next;

    if (!next) {
      lockedBox.hide();
      gridlines?.hide();
      clearActiveMeasurements();
      return;
    }

    const lockedRect = getSafeRect(next, "locked target");
    if (!lockedRect) {
      lockedBox.hide();
      gridlines?.hide();
      clearActiveMeasurements();
      return;
    }

    lockedBox.setRect(lockedRect);
    lockedBox.setLabelsVisible(settings.alwaysShowDimensions);
    lockedBox.show();
    gridlines?.update(lockedRect);
    gridlines?.show();

    if (state.selected && selectedBox) {
      const selectedRect = getSafeRect(state.selected, "selected target");
      if (!selectedRect) {
        clearActiveMeasurements();
        return;
      }

      applyPairLabelSides(selectedRect, lockedRect, selectedBox, lockedBox);
      replaceActiveMeasurements(state.selected, next);
    }
  };

  const updateSelection = (next: Element | Range | null) => {
    if (!selectedBox) {
      return;
    }

    state.selected = next;

    if (!next) {
      selectedBox.hide();
      if (!state.lockedTarget) {
        clearActiveMeasurements();
      }
      return;
    }

    const rect = getSafeRect(next, "selected target");
    if (!rect) {
      selectedBox.hide();
      return;
    }

    selectedBox.setRect(rect);
    selectedBox.setLabelsVisible(settings.alwaysShowDimensions);
    selectedBox.show();
  };

  const updateHover = (next: Element | Range | null) => {
    if (!hoverBox) {
      return;
    }

    state.hovered = next;

    const sameElement = next instanceof Element && state.selected instanceof Element && next === state.selected;

    if (!next || sameElement) {
      hoverBox.hide();
      if (!state.lockedTarget) {
        gridlines?.hide();
        clearActiveMeasurements();
      }
      return;
    }

    const rect = getSafeRect(next, "hover target");
    if (!rect) {
      hoverBox.hide();
      if (!state.lockedTarget) {
        gridlines?.hide();
        clearActiveMeasurements();
      }
      return;
    }

    hoverBox.setRect(rect);
    hoverBox.setLabelsVisible(true);
    hoverBox.show();

    if (!state.lockedTarget) {
      gridlines?.update(rect);
      gridlines?.show();

      if (state.selected) {
        replaceActiveMeasurements(state.selected, next);
      }
    }
  };

  const refreshOnResize = () => {
    if (state.selected) {
      updateSelection(state.selected);
    }

    if (state.hovered) {
      updateHover(state.hovered);
    }

    if (state.lockedTarget) {
      updateLockedTarget(state.lockedTarget);
    }

    refreshFrozenPairs();
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

      refreshOnResize();
    }, RESIZE_DEBOUNCE_MS);
  };

  const handleClick = (event: Event) => {
    if (!state.enabled) {
      return;
    }

    if (!(event instanceof MouseEvent)) {
      return;
    }

    if (typeof event.clientX !== "number" || typeof event.clientY !== "number") {
      return;
    }

    const target = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    if (isOffBounds(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (state.lockedTarget) {
      freezeCurrentPair();
      updateSelection(target);
      updateHover(target);
      return;
    }

    if (!state.selected) {
      updateSelection(target);
      updateHover(target);
      return;
    }

    if (target && state.selected !== target) {
      updateLockedTarget(target);
    }
  };

  const handleMove = (event: Event) => {
    if (!state.enabled) {
      return;
    }

    if (!(event instanceof MouseEvent)) {
      return;
    }

    const target = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    if (isOffBounds(target)) {
      updateHover(null);
      return;
    }

    if (target === state.hovered) {
      return;
    }

    updateHover(target);
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

    if (target && isGuidesUiElement(target)) {
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
    frozenPairs.forEach((pair) => removeFrozenPair(pair));
    frozenPairs = [];
    updateLockedTarget(null);
    updateSelection(null);
    updateHover(null);
  };

  const enable = () => {
    if (state.enabled) {
      return;
    }

    state.enabled = true;
    ensureGuidesStyles();
    guidesRoot = ensureGuidesRoot();
    ensureBoxes();

    window.addEventListener("mousemove", handleMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", scheduleResizeRefresh);
    window.addEventListener("scroll", refreshOnResize, { passive: true, capture: true });
    MOUSE_BLOCK_EVENTS.forEach((type) => {
      window.addEventListener(type, handleMouseBlock, true);
    });
  };

  const disable = () => {
    if (!state.enabled) {
      return;
    }

    state.enabled = false;
    state.selected = null;
    state.hovered = null;
    state.lockedTarget = null;
    selectedBox?.remove();
    hoverBox?.remove();
    lockedBox?.remove();
    gridlines?.remove();
    selectedBox = null;
    hoverBox = null;
    lockedBox = null;
    gridlines = null;
    guidesRoot = null;
    frozenPairs.forEach((pair) => removeFrozenPair(pair));
    frozenPairs = [];
    clearActiveMeasurements();
    if (resizeDebounceId !== null) {
      window.clearTimeout(resizeDebounceId);
      resizeDebounceId = null;
    }
    removeGuidesStyles();
    removeGuidesRoot();

    window.removeEventListener("mousemove", handleMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("resize", scheduleResizeRefresh);
    window.removeEventListener("scroll", refreshOnResize, true);
    MOUSE_BLOCK_EVENTS.forEach((type) => {
      window.removeEventListener(type, handleMouseBlock, true);
    });
  };

  const updateSettings = (next: Partial<GuidesSettings>) => {
    settings.alwaysShowDimensions =
      typeof next.alwaysShowDimensions === "boolean" ? next.alwaysShowDimensions : settings.alwaysShowDimensions;
    settings.keepPairDistances =
      typeof next.keepPairDistances === "boolean" ? next.keepPairDistances : settings.keepPairDistances;

    if (selectedBox) {
      selectedBox.setLabelsVisible(settings.alwaysShowDimensions);
    }

    if (lockedBox) {
      lockedBox.setLabelsVisible(settings.alwaysShowDimensions);
    }

    frozenPairs.forEach((pair) => {
      pair.selectedBox.setLabelsVisible(settings.alwaysShowDimensions);
      pair.lockedBox.setLabelsVisible(settings.alwaysShowDimensions);
      pair.distances.forEach((distance) => distance.setVisible(settings.keepPairDistances));
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
    updateSettings,
    isEnabled: () => state.enabled,
  };
};
