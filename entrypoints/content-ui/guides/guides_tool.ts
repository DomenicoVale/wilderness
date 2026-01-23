import { createGuideBox } from "./guide_box.element";
import { createGridlines } from "./gridlines.element";
import {
  getTargetRect,
  isGuidesUiElement,
  isOffBounds,
  targetElementFromPoint,
} from "./guides_utils";
import { clearMeasurements, createMeasurements } from "./measurements";

const GUIDES_STYLE_ID = "wilderness-guides-styles";
const GUIDES_STYLES = `
.wilderness-guide-box,
.wilderness-distance,
.wilderness-gridlines {
  position: fixed;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 2147483647;
  box-sizing: border-box;
}

.wilderness-guide-box__box {
  position: absolute;
  inset: 0;
  border: 2px solid #8b5cf6;
  box-sizing: border-box;
}

.wilderness-guide-box__label {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 6px;
  background: #111827;
  color: #f9fafb;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  line-height: 1;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
}

.wilderness-guide-box__label--width {
  left: 50%;
  top: -24px;
  transform: translateX(-50%);
}

.wilderness-guide-box__label--height {
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
}

.wilderness-distance__line {
  position: absolute;
  left: 0;
  top: 0;
  background: #22c55e;
}

.wilderness-distance__label {
  position: absolute;
  padding: 2px 6px;
  border-radius: 6px;
  background: #111827;
  color: #f9fafb;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 11px;
  line-height: 1;
  transform: translate(-50%, -50%);
  white-space: nowrap;
}

.wilderness-gridlines {
  width: 100%;
  height: 100%;
}

.wilderness-gridlines__svg {
  width: 100%;
  height: 100%;
}

.wilderness-gridlines__svg line {
  stroke: #f59e0b;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
`;

const ensureGuidesStyles = () => {
  if (document.getElementById(GUIDES_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = GUIDES_STYLE_ID;
  style.textContent = GUIDES_STYLES;

  const parent = document.head ?? document.documentElement;
  if (!parent) {
    console.warn("[Guides] Unable to inject styles: no document root.");
    return;
  }

  parent.append(style);
};

const removeGuidesStyles = () => {
  const style = document.getElementById(GUIDES_STYLE_ID);
  if (!style) {
    return;
  }

  style.remove();
};

type GuidesState = {
  enabled: boolean;
  selected: Element | Range | null;
  hovered: Element | Range | null;
  lockedTarget: Element | Range | null;
};

export type GuidesSettings = {
  alwaysShowDimensions: boolean;
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

export const createGuidesController = () => {
  const state: GuidesState = {
    enabled: false,
    selected: null,
    hovered: null,
    lockedTarget: null,
  };

  const settings: GuidesSettings = {
    alwaysShowDimensions: false,
  };

  let selectedBox: ReturnType<typeof createGuideBox> | null = null;
  let hoverBox: ReturnType<typeof createGuideBox> | null = null;
  let lockedBox: ReturnType<typeof createGuideBox> | null = null;
  let gridlines: ReturnType<typeof createGridlines> | null = null;

  const ensureBoxes = () => {
    if (!selectedBox) {
      selectedBox = createGuideBox("selected");
    }

    if (!hoverBox) {
      hoverBox = createGuideBox("hover");
    }

    if (!lockedBox) {
      lockedBox = createGuideBox("locked");
    }

    if (!gridlines) {
      gridlines = createGridlines();
    }
  };

  const updateLockedTarget = (next: Element | Range | null) => {
    if (!lockedBox) {
      return;
    }

    state.lockedTarget = next;

    if (!next) {
      lockedBox.hide();
      gridlines?.hide();
      clearMeasurements();
      return;
    }

    const rect = getTargetRect(next);
    lockedBox.setRect(rect);
    lockedBox.setLabelsVisible(true);
    lockedBox.show();
    gridlines?.update(rect);
    gridlines?.show();
  };

  const updateSelection = (next: Element | Range | null) => {
    if (!selectedBox) {
      return;
    }

    state.selected = next;

    if (!next) {
      selectedBox.hide();
      if (!state.lockedTarget) {
        clearMeasurements();
      }
      return;
    }

    selectedBox.setRect(getTargetRect(next));
    selectedBox.setLabelsVisible(settings.alwaysShowDimensions);
    selectedBox.show();
  };

  const updateHover = (next: Element | Range | null) => {
    if (!hoverBox) {
      return;
    }

    state.hovered = next;

    const sameElement =
      next instanceof Element &&
      state.selected instanceof Element &&
      next === state.selected;

    if (!next || sameElement) {
      hoverBox.hide();
      if (!state.lockedTarget) {
        gridlines?.hide();
        clearMeasurements();
      }
      return;
    }

    const rect = getTargetRect(next);
    hoverBox.setRect(rect);
    hoverBox.setLabelsVisible(true);
    hoverBox.show();
    if (!state.lockedTarget) {
      gridlines?.update(rect);
      gridlines?.show();

      if (state.selected) {
        createMeasurements(state.selected, next);
      }
    }
  };

  const handleClick = (event: Event) => {
    if (!state.enabled) {
      return;
    }

    if (!(event instanceof MouseEvent)) {
      return;
    }

    if (
      typeof event.clientX !== "number" ||
      typeof event.clientY !== "number"
    ) {
      return;
    }

    const preferDeepest =
      (typeof event.altKey === "boolean" && event.altKey) ||
      (typeof event.metaKey === "boolean" && event.metaKey);
    const target = targetElementFromPoint(
      event.clientX,
      event.clientY,
      preferDeepest,
    );
    if (isOffBounds(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!state.selected) {
      updateSelection(target);
      updateHover(target);
      return;
    }

    if (state.lockedTarget) {
      return;
    }

    if (target && state.selected !== target) {
      updateLockedTarget(target);
      createMeasurements(state.selected, target);
    }
  };

  const handleMove = (event: Event) => {
    if (!state.enabled) {
      return;
    }

    if (!(event instanceof MouseEvent)) {
      return;
    }

    const preferDeepest = event.altKey || event.metaKey;
    const target = targetElementFromPoint(
      event.clientX,
      event.clientY,
      preferDeepest,
    );
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
      event.target instanceof Element
        ? event.target
        : event.target instanceof Node
          ? event.target.parentElement
          : null;

    if (target && isGuidesUiElement(target)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const handleScroll = () => {
    if (!state.enabled) {
      return;
    }

    if (state.selected) {
      updateSelection(state.selected);
    }

    if (state.hovered) {
      updateHover(state.hovered);
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!state.enabled) {
      return;
    }

    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
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
    ensureBoxes();

    window.addEventListener("mousemove", handleMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
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
    clearMeasurements();
    removeGuidesStyles();

    window.removeEventListener("mousemove", handleMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("resize", handleScroll);
    MOUSE_BLOCK_EVENTS.forEach((type) => {
      window.removeEventListener(type, handleMouseBlock, true);
    });
  };

  const updateSettings = (next: Partial<GuidesSettings>) => {
    settings.alwaysShowDimensions =
      typeof next.alwaysShowDimensions === "boolean"
        ? next.alwaysShowDimensions
        : settings.alwaysShowDimensions;

    if (selectedBox) {
      selectedBox.setLabelsVisible(settings.alwaysShowDimensions);
    }
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
