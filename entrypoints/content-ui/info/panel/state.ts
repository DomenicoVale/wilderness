import $ from "jquery";
import { INLINE_STYLE_PRIORITY } from "../core/options";
import type { PendingInspectState } from "../core/types";
import { buildSelectorForElement } from "../utils/common";
import { isStyleWritableElement } from "../utils/style";

type TextState = {
  textContent: string;
  originalTextContent: string;
};

type CreateInspectStateStoreOptions = {
  setDirtyState: (dirty: boolean) => void;
};

export type InspectStateStore = {
  getPendingState: () => PendingInspectState;
  loadPendingState: (next: PendingInspectState, options?: { applyToDocument?: boolean }) => void;
  clearPendingState: (options?: { resetAppliedStyles?: boolean }) => void;
  recordPropertyChange: (target: Element | null, property: string, value: string) => void;
  recordTextChange: (target: Element | null, textContent: string, originalTextContent: string) => void;
  getChangedValue: (target: Element | null, property: string) => string | null;
  applySavedElementStyles: (target: Element) => void;
};

export const createInspectStateStore = ({ setDirtyState }: CreateInspectStateStoreOptions): InspectStateStore => {
  const modifiedBySelector = new Map<string, Map<string, string>>();
  const textBySelector = new Map<string, TextState>();

  const getSelectorForTarget = (target: Element | null) => (target ? buildSelectorForElement(target) : null);

  const queryElementBySelector = (selector: string) => {
    try {
      return $(selector).get(0) ?? null;
    } catch (error) {
      if (selector.startsWith("#")) {
        const byId = $(`#${selector.slice(1)}`).get(0);
        if (byId) {
          return byId;
        }
      }
      console.warn("[Inspect] Invalid selector in persisted style state.", { selector, error });
      return null;
    }
  };

  const applyStylesToElement = (element: Element, styles: Map<string, string> | null) => {
    if (!isStyleWritableElement(element) || !styles || styles.size === 0) {
      return;
    }
    styles.forEach((value, property) => {
      if (!value.trim()) {
        element.style.removeProperty(property);
      } else {
        element.style.setProperty(property, value, INLINE_STYLE_PRIORITY);
      }
    });
  };

  const applyTextToElement = (element: Element, textState: TextState | null) => {
    if (!textState) {
      return;
    }
    element.textContent = textState.textContent;
  };

  const clearStylesFromElement = (element: Element, styles: Map<string, string> | null) => {
    if (!isStyleWritableElement(element) || !styles || styles.size === 0) {
      return;
    }
    styles.forEach((_value, property) => {
      element.style.removeProperty(property);
    });
  };

  const applyModifiedStylesInDocument = () => {
    modifiedBySelector.forEach((styles, selector) => {
      const element = queryElementBySelector(selector);
      if (!element) {
        return;
      }
      applyStylesToElement(element, styles);
    });
    textBySelector.forEach((textState, selector) => {
      const element = queryElementBySelector(selector);
      if (!element) {
        return;
      }
      applyTextToElement(element, textState);
    });
  };

  const clearAllModifiedStylesInDocument = () => {
    modifiedBySelector.forEach((styles, selector) => {
      const element = queryElementBySelector(selector);
      if (!element) {
        return;
      }
      clearStylesFromElement(element, styles);
    });
    textBySelector.forEach((textState, selector) => {
      const element = queryElementBySelector(selector);
      if (!element) {
        return;
      }
      element.textContent = textState.originalTextContent;
    });
  };

  const updateDirtyState = () => {
    setDirtyState(modifiedBySelector.size > 0 || textBySelector.size > 0);
  };

  const getPendingState = (): PendingInspectState => ({
    dirty: modifiedBySelector.size > 0 || textBySelector.size > 0,
    elements: Array.from(new Set([...modifiedBySelector.keys(), ...textBySelector.keys()])).map((selector) => ({
      selector,
      styles: Object.fromEntries((modifiedBySelector.get(selector) ?? new Map<string, string>()).entries()),
      textContent: textBySelector.get(selector)?.textContent,
      originalTextContent: textBySelector.get(selector)?.originalTextContent,
    })),
  });

  const loadPendingState = (next: PendingInspectState, options?: { applyToDocument?: boolean }) => {
    modifiedBySelector.clear();
    textBySelector.clear();
    next.elements.forEach((entry) => {
      if (!entry.selector || !entry.styles) {
        return;
      }
      modifiedBySelector.set(entry.selector, new Map(Object.entries(entry.styles)));
      if (typeof entry.textContent === "string" && typeof entry.originalTextContent === "string") {
        textBySelector.set(entry.selector, {
          textContent: entry.textContent,
          originalTextContent: entry.originalTextContent,
        });
      }
    });
    if (options?.applyToDocument) {
      applyModifiedStylesInDocument();
    }
    updateDirtyState();
  };

  const clearPendingState = (options?: { resetAppliedStyles?: boolean }) => {
    if (options?.resetAppliedStyles) {
      clearAllModifiedStylesInDocument();
    }
    modifiedBySelector.clear();
    textBySelector.clear();
    updateDirtyState();
  };

  const recordPropertyChange = (target: Element | null, property: string, value: string) => {
    const selector = getSelectorForTarget(target);
    if (!selector) {
      return;
    }
    const existing = modifiedBySelector.get(selector) ?? new Map<string, string>();
    if (value.trim()) {
      existing.set(property, value.trim());
      modifiedBySelector.set(selector, existing);
    } else {
      existing.delete(property);
      if (existing.size === 0) {
        modifiedBySelector.delete(selector);
      } else {
        modifiedBySelector.set(selector, existing);
      }
    }
    updateDirtyState();
  };

  const recordTextChange = (target: Element | null, textContent: string, originalTextContent: string) => {
    const selector = getSelectorForTarget(target);
    if (!selector) {
      return;
    }
    if (textContent === originalTextContent) {
      textBySelector.delete(selector);
    } else {
      textBySelector.set(selector, { textContent, originalTextContent });
    }
    updateDirtyState();
  };

  const getChangedValue = (target: Element | null, property: string): string | null => {
    const selector = getSelectorForTarget(target);
    if (!selector) {
      return null;
    }
    const byProperty = modifiedBySelector.get(selector);
    if (!byProperty) {
      return null;
    }
    return byProperty.get(property) ?? null;
  };

  const applySavedElementStyles = (target: Element) => {
    const selector = buildSelectorForElement(target);
    const styles = modifiedBySelector.get(selector);
    applyStylesToElement(target, styles ?? null);
    applyTextToElement(target, textBySelector.get(selector) ?? null);
  };

  return {
    getPendingState,
    loadPendingState,
    clearPendingState,
    recordPropertyChange,
    recordTextChange,
    getChangedValue,
    applySavedElementStyles,
  };
};
