import {
  DISPLAY_OPTIONS,
  FLEX_DIRECTION_OPTIONS,
  FONT_CATALOG,
  getFlexAxisOptions,
  getGridAxisOptions,
  MAIN_SECTION_PROPERTIES,
  POSITION_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  WRAP_OPTIONS,
} from "../core/options";
import type { ApplyStyleOptions, PanelHandle } from "../core/types";
import { loadTreeExpansionState } from "../state/persistence";
import { buildSelectorForElement, getComputedStyleEntries } from "../utils/common";
import { ensureWebFontLoader, getDisplayStyleValue } from "../utils/style";
import { createPanelControls } from "./controls";
import { createPanelLayoutController } from "./layout";
import { createPanelMount } from "./shell";
import { createInspectStateStore } from "./state";
import { createTreeMediaRenderer } from "./tree-media";
import { createVariablePopover } from "./variables";

type CreateInfoPanelOptions = {
  getSelected: () => Element | null;
  applyStyle: (property: string, value: string, options?: ApplyStyleOptions) => void;
};

/**
 * Builds the inspect panel orchestrator. The shell is React-rendered while
 * property sections/tree/media remain imperative for dense update paths.
 */
export const createInfoPanel = ({ getSelected, applyStyle }: CreateInfoPanelOptions): PanelHandle => {
  let onTreeSelect: ((element: Element) => void) | null = null;
  let onRestoreState: (() => Promise<boolean>) | null = null;
  let onPreviewHover: ((element: Element | null) => void) | null = null;
  let isDestroyed = false;
  let currentTarget: Element | null = null;
  let currentTreeTarget: Element | null = null;

  const panelMount = createPanelMount();
  const {
    root,
    leftPanel,
    leftCollapsedWrap,
    leftCollapsedButton,
    leftCollapseButton,
    collapsedWrap,
    collapsedButton,
    collapseButton,
    content,
    headerTop,
    leftHeader,
    sectionsHost,
    treeList,
    mediaList,
  } = panelMount.elements;

  let copyTimeout: number | null = null;
  let statusTimeout: number | null = null;
  let isDirty = false;
  const setDirtyState = (dirty: boolean) => {
    isDirty = dirty;
  };

  const stateStore = createInspectStateStore({ setDirtyState });

  const setCopyFeedback = (visible: boolean) => {
    panelMount.api.setCopyVisible(visible);
    if (visible) {
      panelMount.api.pulseCopy();
    }
  };

  const setStatusFeedback = (message: string, tone: "success" | "error" = "success") => {
    if (!message.trim()) {
      panelMount.api.setStatus({ message: "", tone: "success", visible: false });
      if (statusTimeout !== null) {
        window.clearTimeout(statusTimeout);
        statusTimeout = null;
      }
      return;
    }
    panelMount.api.setStatus({ message, tone, visible: true });
    if (statusTimeout !== null) {
      window.clearTimeout(statusTimeout);
    }
    statusTimeout = window.setTimeout(() => {
      panelMount.api.setStatus({ message: "", tone, visible: false });
      statusTimeout = null;
    }, 1200);
  };

  const variablePopover = createVariablePopover({
    root,
    getCurrentTarget: () => currentTarget,
    setStatusFeedback,
  });

  const updateMediaLayoutMode = () => {
    const leftPanelWidth = leftPanel.getBoundingClientRect().width;
    leftPanel.setAttribute("data-media-layout", leftPanelWidth > 320 ? "wide" : "stacked");
  };

  const layoutController = createPanelLayoutController({
    root,
    leftPanel,
    headerTop,
    leftHeader,
    collapsedWrap,
    leftCollapsedWrap,
    updateMediaLayoutMode,
    hideVariablePopover: () => variablePopover.hide(),
    isDestroyed: () => isDestroyed,
  });

  collapseButton.addEventListener("click", () => layoutController.setCollapsed(true));
  collapsedButton.addEventListener("click", () => layoutController.setCollapsed(false));
  leftCollapseButton.addEventListener("click", () => layoutController.setLeftCollapsed(true));
  leftCollapsedButton.addEventListener("click", () => layoutController.setLeftCollapsed(false));

  const treeExpansionState = loadTreeExpansionState();
  const treeMediaRenderer = createTreeMediaRenderer({
    treeList,
    mediaList,
    treeExpansionState,
    treeNodeRenderLimit: 10000,
    getCurrentTreeTarget: () => currentTreeTarget,
    setCurrentTreeTarget: (target: Element | null) => {
      currentTreeTarget = target;
    },
    getOnTreeSelect: () => onTreeSelect,
    getOnPreviewHover: () => onPreviewHover,
  });

  const controls = createPanelControls({
    body: sectionsHost,
    applyStyle,
    recordPropertyChange: stateStore.recordPropertyChange,
    getCurrentTarget: () => currentTarget,
    appendVariableButton: variablePopover.appendVariableButton,
  });

  const resetStyleProperty = (property: string) => {
    stateStore.recordPropertyChange(currentTarget, property, "");
    applyStyle(property, "");
  };

  panelMount.api.setCopyAction(async () => {
    const selected = getSelected();
    if (!selected) {
      return;
    }

    const selector = buildSelectorForElement(selected);
    try {
      await navigator.clipboard.writeText(selector);
    } catch (error) {
      console.warn("[Inspect] Failed to copy selector.", error);
      return;
    }

    setCopyFeedback(true);
    if (copyTimeout !== null) {
      window.clearTimeout(copyTimeout);
    }
    copyTimeout = window.setTimeout(() => {
      setCopyFeedback(false);
      copyTimeout = null;
    }, 700);
  });

  panelMount.api.setRestoreAction(async () => {
    if (!onRestoreState) {
      setStatusFeedback("No saved state", "error");
      return;
    }
    try {
      const restored = await onRestoreState();
      setStatusFeedback(restored ? "State restored" : "No saved state", restored ? "success" : "error");
    } catch (error) {
      console.warn("[Inspect] Unable to restore saved state.", error);
      setStatusFeedback("Restore failed", "error");
    }
  });

  const cleanup = () => {
    isDestroyed = true;
    if (copyTimeout !== null) {
      window.clearTimeout(copyTimeout);
    }
    if (statusTimeout !== null) {
      window.clearTimeout(statusTimeout);
    }
    variablePopover.destroy();
    layoutController.destroy();
    panelMount.api.setCopyAction(null);
    panelMount.api.setRestoreAction(null);
    setCopyFeedback(false);
    panelMount.api.setStatus({ message: "", tone: "success", visible: false });
    onPreviewHover?.(null);
    panelMount.unmount();
  };

  const render = (target: Element | null, options?: { preserveScroll?: boolean }) => {
    variablePopover.hide();
    currentTarget = target;
    const preserveScroll = options?.preserveScroll ?? false;
    const preservedContentScrollTop = content.scrollTop;
    const preservedContentScrollLeft = content.scrollLeft;
    sectionsHost.replaceChildren();
    treeMediaRenderer.clearMediaList();

    if (!target) {
      currentTreeTarget = null;
      setCopyFeedback(false);
      onPreviewHover?.(null);
      panelMount.api.setSelectorText("[NO SELECTION]");
      panelMount.api.setShowRestore(true);
      setStatusFeedback("", "success");
      setDirtyState(isDirty);
      return;
    }

    stateStore.applySavedElementStyles(target);
    currentTreeTarget = target;
    onPreviewHover?.(null);
    panelMount.api.setShowRestore(false);
    treeMediaRenderer.ensureSelectedTreePathExpanded(target);

    const computed = window.getComputedStyle(target);
    const displayValue = (property: string, computedValue: string) => getDisplayStyleValue(target, property, computedValue);
    const displayOrSaved = (property: string, computedValue: string) =>
      stateStore.getChangedValue(target, property) ?? displayValue(property, computedValue);
    panelMount.api.setSelectorText(buildSelectorForElement(target));

    const displayMode = computed.display;
    const isFlexContainer = displayMode.includes("flex");
    const isGridContainer = displayMode.includes("grid");

    treeMediaRenderer.renderTreeListInPlace(preserveScroll);
    treeMediaRenderer.renderMediaListForTarget(target);

    const position = controls.section("Position");
    controls.addSelect(position, "display", "display", displayOrSaved("display", computed.display), DISPLAY_OPTIONS, {
      onReset: () => resetStyleProperty("display"),
    });
    controls.addSelect(position, "position", "position", displayOrSaved("position", computed.position), POSITION_OPTIONS, {
      onReset: () => resetStyleProperty("position"),
    });
    controls.addNumberInput(position, "top", "top", displayOrSaved("top", computed.top), {
      onReset: () => resetStyleProperty("top"),
    });
    controls.addNumberInput(position, "right", "right", displayOrSaved("right", computed.right), {
      onReset: () => resetStyleProperty("right"),
    });
    controls.addNumberInput(position, "bottom", "bottom", displayOrSaved("bottom", computed.bottom), {
      onReset: () => resetStyleProperty("bottom"),
    });
    controls.addNumberInput(position, "left", "left", displayOrSaved("left", computed.left), {
      onReset: () => resetStyleProperty("left"),
    });
    controls.addNumberInput(position, "width", "width", displayOrSaved("width", computed.width), {
      onReset: () => resetStyleProperty("width"),
    });
    controls.addNumberInput(position, "height", "height", displayOrSaved("height", computed.height), {
      onReset: () => resetStyleProperty("height"),
    });
    controls.addTransformEditor(position, "transform", displayOrSaved("transform", computed.transform), () =>
      resetStyleProperty("transform")
    );

    if (isFlexContainer || isGridContainer) {
      const layout = controls.section("Layout");
      if (isFlexContainer) {
        const flexDirectionValue = displayOrSaved("flex-direction", computed.flexDirection);
        const flexAxisOptions = getFlexAxisOptions(flexDirectionValue);
        controls.addSegmented(layout, "flex-direction", "flex-direction", flexDirectionValue, FLEX_DIRECTION_OPTIONS, {
          onReset: () => resetStyleProperty("flex-direction"),
        });
        controls.addSegmented(
          layout,
          "justify-content (main)",
          "justify-content",
          displayOrSaved("justify-content", computed.justifyContent),
          flexAxisOptions.justify,
          { onReset: () => resetStyleProperty("justify-content") }
        );
        controls.addSegmented(
          layout,
          "align-items (cross)",
          "align-items",
          displayOrSaved("align-items", computed.alignItems),
          flexAxisOptions.align,
          { onReset: () => resetStyleProperty("align-items") }
        );
        controls.addSegmented(layout, "flex-wrap", "flex-wrap", displayOrSaved("flex-wrap", computed.flexWrap), WRAP_OPTIONS, {
          onReset: () => resetStyleProperty("flex-wrap"),
        });
      }
      if (isGridContainer) {
        const gridAxisOptions = getGridAxisOptions(computed);
        controls.addSegmented(
          layout,
          "justify-items",
          "justify-items",
          displayOrSaved("justify-items", computed.justifyItems),
          gridAxisOptions.justify,
          { onReset: () => resetStyleProperty("justify-items") }
        );
        controls.addSegmented(
          layout,
          "align-items",
          "align-items",
          displayOrSaved("align-items", computed.alignItems),
          gridAxisOptions.align,
          { onReset: () => resetStyleProperty("align-items") }
        );
      }
      controls.addNumberInput(layout, "gap", "gap", displayOrSaved("gap", computed.gap), {
        onReset: () => resetStyleProperty("gap"),
      });
      controls.addNumberInput(layout, "row-gap", "row-gap", displayOrSaved("row-gap", computed.rowGap), {
        onReset: () => resetStyleProperty("row-gap"),
      });
      controls.addNumberInput(layout, "column-gap", "column-gap", displayOrSaved("column-gap", computed.columnGap), {
        onReset: () => resetStyleProperty("column-gap"),
      });
    }

    const spacing = controls.section("Spacing");
    controls.addInsetInputs(spacing, "margin", [
      { edge: "Top", property: "margin-top", value: displayOrSaved("margin-top", computed.marginTop) },
      { edge: "Right", property: "margin-right", value: displayOrSaved("margin-right", computed.marginRight) },
      { edge: "Bottom", property: "margin-bottom", value: displayOrSaved("margin-bottom", computed.marginBottom) },
      { edge: "Left", property: "margin-left", value: displayOrSaved("margin-left", computed.marginLeft) },
    ]);
    controls.addInsetInputs(spacing, "padding", [
      { edge: "Top", property: "padding-top", value: displayOrSaved("padding-top", computed.paddingTop) },
      { edge: "Right", property: "padding-right", value: displayOrSaved("padding-right", computed.paddingRight) },
      { edge: "Bottom", property: "padding-bottom", value: displayOrSaved("padding-bottom", computed.paddingBottom) },
      { edge: "Left", property: "padding-left", value: displayOrSaved("padding-left", computed.paddingLeft) },
    ]);

    const appearance = controls.section("Appearance");
    controls.addColorInput(appearance, "color", "color", displayOrSaved("color", computed.color), {
      onReset: () => resetStyleProperty("color"),
    });
    controls.addColorInput(
      appearance,
      "background-color",
      "background-color",
      displayOrSaved("background-color", computed.backgroundColor),
      { onReset: () => resetStyleProperty("background-color") }
    );
    controls.addColorInput(appearance, "border-color", "border-color", displayOrSaved("border-color", computed.borderColor), {
      onReset: () => resetStyleProperty("border-color"),
    });
    controls.addNumberInput(appearance, "border-width", "border-width", displayOrSaved("border-width", computed.borderWidth), {
      onReset: () => resetStyleProperty("border-width"),
    });
    controls.addTextInput(appearance, "border-style", "border-style", displayOrSaved("border-style", computed.borderStyle), {
      onReset: () => resetStyleProperty("border-style"),
    });
    controls.addNumberInput(
      appearance,
      "border-radius",
      "border-radius",
      displayOrSaved("border-radius", computed.borderRadius),
      {
        onReset: () => resetStyleProperty("border-radius"),
      }
    );
    controls.addTextInput(appearance, "box-shadow", "box-shadow", displayOrSaved("box-shadow", computed.boxShadow), {
      onReset: () => resetStyleProperty("box-shadow"),
    });
    controls.addNumberInput(appearance, "opacity", "opacity", displayOrSaved("opacity", computed.opacity), {
      onReset: () => resetStyleProperty("opacity"),
    });

    const typography = controls.section("Typography");
    const fontInput = controls.addTextInput(
      typography,
      "font-family",
      "font-family",
      displayOrSaved("font-family", computed.fontFamily),
      {
        datalist: FONT_CATALOG,
        onCommit: async (nextFont: string) => {
          try {
            const WebFont = await ensureWebFontLoader();
            WebFont.load({
              google: {
                families: [nextFont],
              },
            });
          } catch (error) {
            console.warn("[Inspect] Unable to load Google Font.", error);
          }
        },
        onReset: () => resetStyleProperty("font-family"),
      }
    );
    fontInput.placeholder = "Inter, Roboto, ...";
    controls.addNumberInput(typography, "font-size", "font-size", displayOrSaved("font-size", computed.fontSize), {
      onReset: () => resetStyleProperty("font-size"),
    });
    controls.addTextInput(typography, "font-weight", "font-weight", displayOrSaved("font-weight", computed.fontWeight), {
      onReset: () => resetStyleProperty("font-weight"),
    });
    controls.addNumberInput(typography, "line-height", "line-height", displayOrSaved("line-height", computed.lineHeight), {
      onReset: () => resetStyleProperty("line-height"),
    });
    controls.addNumberInput(
      typography,
      "letter-spacing",
      "letter-spacing",
      displayOrSaved("letter-spacing", computed.letterSpacing),
      {
        onReset: () => resetStyleProperty("letter-spacing"),
      }
    );
    controls.addSegmented(
      typography,
      "text-align",
      "text-align",
      displayOrSaved("text-align", computed.textAlign),
      TEXT_ALIGN_OPTIONS,
      {
        onReset: () => resetStyleProperty("text-align"),
      }
    );

    const allProperties = controls.section("All CSS Props");
    const entries = getComputedStyleEntries(target).filter((entry) => !MAIN_SECTION_PROPERTIES.has(entry.property));
    controls.addAllCssProps(allProperties, entries);

    if (preserveScroll) {
      requestAnimationFrame(() => {
        content.scrollTop = preservedContentScrollTop;
        content.scrollLeft = preservedContentScrollLeft;
      });
    }
  };

  return {
    root,
    remove: cleanup,
    destroy: cleanup,
    setCollapsed: (collapsed) => {
      layoutController.setCollapsed(collapsed);
    },
    setVisible: (visible) => {
      if (isDestroyed) {
        return;
      }
      if (!visible) {
        layoutController.writeLayoutState();
      }
      root.style.display = visible ? "flex" : "none";
      leftPanel.style.display = visible ? "flex" : "none";
      if (!visible) {
        variablePopover.hide();
        return;
      }
      void layoutController.hydrateAndApplySavedLayout();
      if (!root.style.left) {
        const panelRect = root.getBoundingClientRect();
        layoutController.setRightPanelPosition(panelRect.left || window.innerWidth - 380, panelRect.top || 8);
      }
      if (!leftPanel.style.left) {
        const leftRect = leftPanel.getBoundingClientRect();
        layoutController.setLeftPanelPosition(leftRect.left || 8, leftRect.top || 8);
      }
    },
    render,
    setDirtyState,
    getPendingState: () => stateStore.getPendingState(),
    loadPendingState: (next, options) => stateStore.loadPendingState(next, options),
    clearPendingState: (options) => stateStore.clearPendingState(options),
    recordTextChange: (target, textContent, originalTextContent) =>
      stateStore.recordTextChange(target, textContent, originalTextContent),
    setSelectionCallback: (callback) => {
      onTreeSelect = callback;
    },
    setPreviewHoverCallback: (callback) => {
      onPreviewHover = callback;
    },
    setRestoreStateCallback: (callback) => {
      onRestoreState = callback;
    },
    setStatusFeedback,
  };
};
