import $ from "jquery";
import { createGuideBox } from "./guide_box.element";
import { createGridlines } from "./gridlines.element";
import { deepElementFromPoint, isOffBounds } from "./guides_utils";
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
  selected: Element | null;
  hovered: Element | null;
};

export const createGuidesController = () => {
  const state: GuidesState = {
    enabled: false,
    selected: null,
    hovered: null,
  };

  let selectedBox: ReturnType<typeof createGuideBox> | null = null;
  let hoverBox: ReturnType<typeof createGuideBox> | null = null;
  let gridlines: ReturnType<typeof createGridlines> | null = null;

  const ensureBoxes = () => {
    if (!selectedBox) {
      selectedBox = createGuideBox("selected");
    }

    if (!hoverBox) {
      hoverBox = createGuideBox("hover");
    }

    if (!gridlines) {
      gridlines = createGridlines();
    }
  };

  const updateSelection = (next: Element | null) => {
    if (!selectedBox) {
      return;
    }

    state.selected = next;

    if (!next) {
      selectedBox.hide();
      clearMeasurements();
      return;
    }

    selectedBox.setRect(next.getBoundingClientRect());
    selectedBox.show();
  };

  const updateHover = (next: Element | null) => {
    if (!hoverBox) {
      return;
    }

    state.hovered = next;

    if (!next || next === state.selected) {
      hoverBox.hide();
      gridlines?.hide();
      clearMeasurements();
      return;
    }

    const rect = next.getBoundingClientRect();
    hoverBox.setRect(rect);
    hoverBox.show();
    gridlines?.update(rect);
    gridlines?.show();

    if (state.selected) {
      createMeasurements(state.selected, next);
    }
  };

  const handleMove = (event: JQuery.Event) => {
    if (
      typeof event.clientX !== "number" ||
      typeof event.clientY !== "number"
    ) {
      return;
    }

    if (!state.enabled) {
      return;
    }

    const target = deepElementFromPoint(event.clientX, event.clientY);
    if (isOffBounds(target)) {
      updateHover(null);
      return;
    }

    if (target === state.hovered) {
      return;
    }

    updateHover(target);
  };

  const handleClick = (event: JQuery.Event) => {
    if (
      typeof event.clientX !== "number" ||
      typeof event.clientY !== "number"
    ) {
      return;
    }

    if (!state.enabled) {
      return;
    }

    const target = deepElementFromPoint(event.clientX, event.clientY);
    if (isOffBounds(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    updateSelection(target);
    updateHover(target);
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

  const enable = () => {
    if (state.enabled) {
      return;
    }

    state.enabled = true;
    ensureGuidesStyles();
    ensureBoxes();

    $("body").on("mousemove", handleMove);
    $("body").on("click", handleClick);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
  };

  const disable = () => {
    if (!state.enabled) {
      return;
    }

    state.enabled = false;
    state.selected = null;
    state.hovered = null;
    selectedBox?.remove();
    hoverBox?.remove();
    gridlines?.remove();
    selectedBox = null;
    hoverBox = null;
    gridlines = null;
    clearMeasurements();
    removeGuidesStyles();

    $("body").off("mousemove", handleMove);
    $("body").off("click", handleClick);
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("resize", handleScroll);
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
