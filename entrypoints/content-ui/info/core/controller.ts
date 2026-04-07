import $ from "jquery";
import { type DeepTarget, getDeepTargetFromPoint, getElementForTarget, isDeepPickEvent } from "../../../../lib/deep-pick";
import { createLayoutOverlay, type LayoutOverlayHandle } from "../overlays/layout";
import { createOutline, getSafeRect, hideOutline, isDeepTarget, showOutline } from "../overlays/outline";
import { createInfoPanel } from "../panel";
import {
  clearPersistedInspectState,
  clearPersistedPanelLayoutState,
  hydratePanelLayoutState,
  INSPECT_STATE_VERSION,
  loadPersistedInspectState,
  savePersistedInspectState,
} from "../state/persistence";
import { isInfoUiElement, isInfoUiEvent, isOffBounds, observeRemoval } from "../utils/common";
import { isStyleWritableElement } from "../utils/style";
import { INLINE_STYLE_PRIORITY, MOUSE_BLOCK_EVENTS } from "./options";
import { ensureInfoStyles, removeInfoStyles } from "./styles";
import type { InfoSettings, SelectionTarget } from "./types";

/**
 * Wires inspect lifecycle: selection/hover handling, overlays, panel sync, and
 * persisted state restore/save behavior.
 */
export const createInfoController = () => {
  const settings: InfoSettings = {
    showActualLayoutDistances: true,
  };

  const state: {
    enabled: boolean;
    hoverTarget: DeepTarget | null;
    previewHoverElement: Element | null;
    selectedTarget: DeepTarget | null;
    selectedElement: Element | null;
    overlay: LayoutOverlayHandle | null;
    persistedLoaded: boolean;
    editingTextElement: HTMLElement | null;
  } = {
    enabled: false,
    hoverTarget: null,
    previewHoverElement: null,
    selectedTarget: null,
    selectedElement: null,
    overlay: null,
    persistedLoaded: false,
    editingTextElement: null,
  };

  const hoverOutline = createOutline("hover");
  const selectedOutline = createOutline("pinned");
  let restoreInFlight = false;

  const panel = createInfoPanel({
    getSelected: () => state.selectedElement,
    applyStyle: (property, value, options) => {
      if (!isStyleWritableElement(state.selectedElement)) {
        console.warn("[Inspect] Selected element cannot accept inline style updates.");
        return;
      }

      const next = value.trim();
      if (!next) {
        state.selectedElement.style.removeProperty(property);
      } else {
        state.selectedElement.style.setProperty(property, next, INLINE_STYLE_PRIORITY);
        const applied = state.selectedElement.style.getPropertyValue(property).trim();
        if (!applied) {
          console.warn(`[Inspect] Failed to apply style "${property}: ${next}".`);
        }
      }
      if (options?.rerender !== false) {
        panel.render(state.selectedElement, { preserveScroll: true });
      }
      if (state.selectedTarget) {
        const rect = getSafeRect(state.selectedTarget, "selected outline");
        if (rect) {
          showOutline(selectedOutline, rect);
        }
      } else if (state.selectedElement) {
        showOutline(selectedOutline, state.selectedElement.getBoundingClientRect());
      }
      if (state.overlay && state.selectedElement) {
        state.overlay.update(state.selectedElement, { showActualDistances: settings.showActualLayoutDistances });
      }
    },
  });

  const startInlineTextEdit = (element: Element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    if (state.editingTextElement && state.editingTextElement !== element) {
      state.editingTextElement.blur();
    }
    if (state.editingTextElement === element && $(element).attr("contenteditable") === "plaintext-only") {
      return;
    }
    if (isInfoUiElement(element)) {
      return;
    }
    const text = (element.textContent ?? "").trim();
    if (!text) {
      return;
    }
    state.editingTextElement = element;
    const originalText = element.textContent ?? "";
    const applyEditedTextValue = (value: string) => {
      if (value.includes("\n")) {
        const safe = value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
        element.innerHTML = safe.replaceAll("\n", "<br>");
        return;
      }
      element.textContent = value;
    };
    $(element).attr({
      contenteditable: "plaintext-only",
      "data-wilderness-editing-text": "true",
    });
    element.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const handleEditKeydown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        element.blur();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        applyEditedTextValue(originalText);
        element.blur();
      }
    };

    const finish = () => {
      const edited = element.textContent ?? "";
      element.removeEventListener("keydown", handleEditKeydown);
      $(element).removeAttr("contenteditable data-wilderness-editing-text");
      applyEditedTextValue(edited);
      panel.recordTextChange(element, edited, originalText);
      state.editingTextElement = null;
      panel.render(state.selectedElement, { preserveScroll: true });
    };

    element.addEventListener(
      "blur",
      () => {
        finish();
      },
      { once: true }
    );

    element.addEventListener("keydown", handleEditKeydown);
  };

  const isEditingTarget = (target: EventTarget | null) =>
    Boolean(state.editingTextElement && target instanceof Node && state.editingTextElement.contains(target));

  const isRestoreButtonEventTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest(".wilderness-inspect-restore__button"));

  const restoreState = async () => {
    const persisted = await loadPersistedInspectState();
    panel.loadPendingState({ dirty: persisted.elements.length > 0, elements: persisted.elements }, { applyToDocument: true });
    state.persistedLoaded = true;
    if (state.selectedElement) {
      panel.render(state.selectedElement, { preserveScroll: true });
      if (state.overlay) {
        state.overlay.update(state.selectedElement, { showActualDistances: settings.showActualLayoutDistances });
      }
    } else {
      panel.render(null, { preserveScroll: true });
    }
    return persisted.elements.length > 0;
  };

  const saveState = async () => {
    const pending = panel.getPendingState();
    try {
      await savePersistedInspectState({
        version: INSPECT_STATE_VERSION,
        elements: pending.elements,
      });
      panel.setStatusFeedback("State saved", "success");
      return { message: "State saved", tone: "success" as const };
    } catch (error) {
      console.warn("[Inspect] Unable to save state.", error);
      panel.setStatusFeedback("Save failed", "error");
      return { message: "Save failed", tone: "error" as const };
    }
  };

  const clearState = async () => {
    try {
      panel.clearPendingState({ resetAppliedStyles: true });
      await clearPersistedInspectState();
      await clearPersistedPanelLayoutState();
      await hydratePanelLayoutState();
      state.persistedLoaded = false;
      panel.setCollapsed(false);
      panel.render(state.selectedElement, { preserveScroll: true });
      panel.setStatusFeedback("State cleared", "success");
    } catch (error) {
      console.warn("[Inspect] Unable to clear state.", error);
      panel.setStatusFeedback("Clear failed", "error");
    }
  };

  const hydratePersistedState = async () => {
    if (state.persistedLoaded) {
      return;
    }
    const persisted = await loadPersistedInspectState();
    panel.loadPendingState({ dirty: persisted.elements.length > 0, elements: persisted.elements }, { applyToDocument: false });
    state.persistedLoaded = true;
    if (state.selectedElement) {
      panel.render(state.selectedElement, { preserveScroll: true });
      return;
    }
    panel.render(null, { preserveScroll: true });
  };

  panel.setSelectionCallback((element) => {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    const rect = element.getBoundingClientRect();
    const pickX = Math.min(Math.max(0, rect.left + Math.min(10, rect.width / 2)), window.innerWidth - 1);
    const pickY = Math.min(Math.max(0, rect.top + Math.min(10, rect.height / 2)), window.innerHeight - 1);
    const target = getDeepTargetFromPoint(pickX, pickY, false);
    if (!target || getElementForTarget(target) !== element) {
      setSelection(element, element);
      return;
    }
    setSelection(target, element);
  });

  panel.setPreviewHoverCallback((element) => {
    state.previewHoverElement = element;
    if (!state.enabled) {
      return;
    }
    if (!element) {
      hideOutline(hoverOutline);
      return;
    }
    showOutline(hoverOutline, element.getBoundingClientRect());
  });

  panel.setRestoreStateCallback(async () => restoreState());

  const mountParent = document.documentElement ?? document.body;
  if (!mountParent) {
    console.warn("[Inspect] Unable to mount outlines: no document root.");
  } else {
    $(mountParent).append(hoverOutline, selectedOutline);
  }

  const clearSelection = () => {
    if (state.editingTextElement) {
      state.editingTextElement.blur();
    }
    state.selectedTarget = null;
    state.selectedElement = null;
    state.previewHoverElement = null;
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
    }
    panel.render(null);
    hideOutline(selectedOutline);
  };

  const setSelection = (target: SelectionTarget, element: Element) => {
    if (state.editingTextElement) {
      state.editingTextElement.blur();
    }
    state.selectedTarget = isDeepTarget(target) ? target : null;
    state.selectedElement = element;
    state.previewHoverElement = null;

    if (isDeepTarget(target)) {
      const selectedRect = getSafeRect(target, "selected element");
      if (selectedRect) {
        showOutline(selectedOutline, selectedRect);
      } else {
        hideOutline(selectedOutline);
      }
    } else {
      showOutline(selectedOutline, element.getBoundingClientRect());
    }

    if (!state.overlay) {
      state.overlay = createLayoutOverlay();
    }
    state.overlay.update(element, { showActualDistances: settings.showActualLayoutDistances });
    panel.render(element);

    observeRemoval(element, () => {
      if (state.selectedElement === element) {
        clearSelection();
      }
    });
  };

  const handleMove = (event: Event) => {
    if (!state.enabled || !(event instanceof MouseEvent)) {
      return;
    }
    if (state.editingTextElement) {
      return;
    }
    if (isInfoUiEvent(event)) {
      state.hoverTarget = null;
      if (!state.previewHoverElement) {
        hideOutline(hoverOutline);
      }
      return;
    }

    const target = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    const element = getElementForTarget(target);
    if (!target || !element || isOffBounds(target)) {
      state.hoverTarget = null;
      if (!state.previewHoverElement) {
        hideOutline(hoverOutline);
      }
      return;
    }

    if (state.previewHoverElement) {
      return;
    }
    state.hoverTarget = target;
    const rect = getSafeRect(target, "hover outline");
    if (rect) {
      showOutline(hoverOutline, rect);
    } else {
      hideOutline(hoverOutline);
    }
  };

  const handleClick = (event: Event) => {
    if (!state.enabled || !(event instanceof MouseEvent)) {
      return;
    }
    if (isRestoreButtonEventTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      if (restoreInFlight) {
        return;
      }
      restoreInFlight = true;
      void restoreState()
        .then((restored) => {
          panel.setStatusFeedback(restored ? "State restored" : "No saved state", restored ? "success" : "error");
        })
        .catch((error) => {
          console.warn("[Inspect] Unable to restore saved state.", error);
          panel.setStatusFeedback("Restore failed", "error");
        })
        .finally(() => {
          restoreInFlight = false;
        });
      return;
    }
    if (state.editingTextElement) {
      if (isEditingTarget(event.target)) {
        return;
      }
      state.editingTextElement.blur();
      return;
    }
    if (isInfoUiEvent(event)) {
      return;
    }
    if (event.detail > 1) {
      return;
    }

    const target = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    const element = getElementForTarget(target);
    if (!target || !element || isOffBounds(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelection(target, element);
  };

  const handleDoubleClick = (event: Event) => {
    if (!state.enabled || !(event instanceof MouseEvent)) {
      return;
    }
    if (isRestoreButtonEventTarget(event.target)) {
      return;
    }
    if (state.editingTextElement) {
      if (isEditingTarget(event.target)) {
        return;
      }
      state.editingTextElement.blur();
      return;
    }
    if (isInfoUiEvent(event)) {
      return;
    }
    const deepTarget = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    if (deepTarget && isOffBounds(deepTarget)) {
      return;
    }
    const target = getElementForTarget(deepTarget) ?? (event.target instanceof Element ? event.target : null);
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    requestAnimationFrame(() => {
      if (!state.enabled) {
        return;
      }
      startInlineTextEdit(target);
    });
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!state.enabled || event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    clearSelection();
  };

  const handleMouseBlock = (event: Event) => {
    if (!state.enabled || !(event instanceof MouseEvent)) {
      return;
    }
    if (state.editingTextElement) {
      return;
    }

    const targetEl =
      event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
    if (targetEl?.closest(".wilderness-inspect-restore__button")) {
      return;
    }
    const isUiEvent = isInfoUiEvent(event);
    if (isUiEvent) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const refreshVisuals = () => {
    if (!state.enabled) {
      return;
    }

    if (state.previewHoverElement) {
      showOutline(hoverOutline, state.previewHoverElement.getBoundingClientRect());
    } else if (state.hoverTarget) {
      const rect = getSafeRect(state.hoverTarget, "hover outline");
      if (rect) {
        showOutline(hoverOutline, rect);
      }
    }

    if (state.selectedTarget) {
      const rect = getSafeRect(state.selectedTarget, "selected outline");
      if (rect) {
        showOutline(selectedOutline, rect);
      }
    } else if (state.selectedElement) {
      showOutline(selectedOutline, state.selectedElement.getBoundingClientRect());
    }

    if (state.overlay && state.selectedElement) {
      state.overlay.update(state.selectedElement, { showActualDistances: settings.showActualLayoutDistances });
    }
  };

  const enable = () => {
    if (state.enabled) {
      return;
    }
    state.enabled = true;
    ensureInfoStyles();
    panel.setVisible(true);
    panel.render(state.selectedElement, { preserveScroll: true });
    void hydratePersistedState();

    window.addEventListener("mousemove", handleMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("dblclick", handleDoubleClick, true);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", refreshVisuals, true);
    window.addEventListener("resize", refreshVisuals);
    MOUSE_BLOCK_EVENTS.forEach((type) => window.addEventListener(type, handleMouseBlock, true));
  };

  const disable = () => {
    if (!state.enabled) {
      return;
    }
    state.enabled = false;
    clearSelection();
    state.hoverTarget = null;
    hideOutline(hoverOutline);
    hideOutline(selectedOutline);
    panel.setVisible(false);
    removeInfoStyles();

    window.removeEventListener("mousemove", handleMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("dblclick", handleDoubleClick, true);
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("scroll", refreshVisuals, true);
    window.removeEventListener("resize", refreshVisuals);
    MOUSE_BLOCK_EVENTS.forEach((type) => window.removeEventListener(type, handleMouseBlock, true));
  };

  void Promise.all([hydratePanelLayoutState(), hydratePersistedState()]);

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
    destroy: () => {
      disable();
      panel.destroy();
    },
    toggle,
    saveState,
    clearState,
    updateSettings: (next: Partial<InfoSettings>) => {
      settings.showActualLayoutDistances =
        typeof next.showActualLayoutDistances === "boolean" ? next.showActualLayoutDistances : settings.showActualLayoutDistances;
      refreshVisuals();
      panel.render(state.selectedElement, { preserveScroll: true });
    },
    isEnabled: () => state.enabled,
  };
};
