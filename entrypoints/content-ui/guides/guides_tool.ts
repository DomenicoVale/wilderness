import $ from "jquery";
import { createGuideBox } from "./guide_box.element";
import { createGridlines } from "./gridlines.element";
import { deepElementFromPoint, isOffBounds } from "./guides_utils";
import { clearMeasurements, createMeasurements } from "./measurements";

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

    hoverBox.setRect(next.getBoundingClientRect());
    hoverBox.show();
    gridlines?.update(next.getBoundingClientRect());
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
