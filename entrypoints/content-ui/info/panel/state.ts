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

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const applyTextValue = (element: Element, value: string) => {
    if (element instanceof HTMLElement && value.includes("\n")) {
      element.innerHTML = escapeHtml(value).replaceAll("\n", "<br>");
      return;
    }
    element.textContent = value;
  };

  const getSelectorForTarget = (target: Element | null) => (target ? buildSelectorForElement(target) : null);

  const applyStylesToElement = (element: Element, styles: Map<string, string> | null) => {
    if (!isStyleWritableElement(element) || !styles || styles.size === 0) {
      return;
    }
    styles.forEach((value, property) => {
      const next = value.trim();
      if (!next) {
        element.style.removeProperty(property);
      } else {
        element.style.setProperty(property, next, INLINE_STYLE_PRIORITY);
      }
    });
  };

  const applyTextToElement = (element: Element, textState: TextState | null) => {
    if (!textState) {
      return;
    }
    applyTextValue(element, textState.textContent);
  };

  const clearStylesFromElement = (element: Element, styles: Map<string, string> | null) => {
    if (!isStyleWritableElement(element) || !styles || styles.size === 0) {
      return;
    }
    styles.forEach((_value, property) => {
      element.style.removeProperty(property);
    });
  };

  const appendUnique = (target: Element[], candidates: Element[]) => {
    candidates.forEach((candidate) => {
      if (!target.includes(candidate)) {
        target.push(candidate);
      }
    });
  };

  const queryElementsBySavedSelector = (selector: string) => {
    const elements: Element[] = [];
    try {
      appendUnique(elements, Array.from(document.querySelectorAll(selector)));
    } catch {
      return elements;
    }
    if (elements.length > 0) {
      return elements;
    }

    const simplifiedSegments = selector
      .split(">")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        if (segment.startsWith("#")) {
          return segment;
        }
        const nth = segment.match(/:nth-of-type\(\d+\)$/)?.[0] ?? "";
        const tag = segment.match(/^[a-zA-Z][\w-]*/)?.[0] ?? "";
        if (!tag) {
          return "";
        }
        return `${tag}${nth}`;
      })
      .filter(Boolean);

    if (simplifiedSegments.length === 0) {
      return elements;
    }

    const simplifiedSelector = simplifiedSegments.join(" > ");
    if (simplifiedSelector !== selector) {
      try {
        appendUnique(elements, Array.from(document.querySelectorAll(simplifiedSelector)));
      } catch {
        // noop
      }
    }
    if (elements.length > 0) {
      return elements;
    }

    const noNthSelector = simplifiedSegments.map((segment) => segment.replace(/:nth-of-type\(\d+\)$/g, "")).join(" > ");
    if (noNthSelector && noNthSelector !== simplifiedSelector && noNthSelector !== selector) {
      try {
        appendUnique(elements, Array.from(document.querySelectorAll(noNthSelector)));
      } catch {
        // noop
      }
    }

    if (elements.length > 0) {
      return elements;
    }

    const idMatch = selector.match(/#[A-Za-z0-9_-]+/);
    if (idMatch) {
      try {
        appendUnique(elements, Array.from(document.querySelectorAll(idMatch[0])));
      } catch {
        // noop
      }
    }
    return elements;
  };

  const applyModifiedStylesInDocument = () => {
    const selectors = new Set([...modifiedBySelector.keys(), ...textBySelector.keys()]);
    selectors.forEach((selector) => {
      const elements = queryElementsBySavedSelector(selector);
      elements.forEach((element) => {
        applyStylesToElement(element, modifiedBySelector.get(selector) ?? null);
        applyTextToElement(element, textBySelector.get(selector) ?? null);
      });
    });
  };

  const clearAllModifiedStylesInDocument = () => {
    const selectors = new Set([...modifiedBySelector.keys(), ...textBySelector.keys()]);
    selectors.forEach((selector) => {
      const elements = queryElementsBySavedSelector(selector);
      elements.forEach((element) => {
        clearStylesFromElement(element, modifiedBySelector.get(selector) ?? null);
        const textState = textBySelector.get(selector);
        if (textState) {
          applyTextValue(element, textState.originalTextContent);
        }
      });
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
      if (!entry.selector || !entry.styles || typeof entry.styles !== "object") {
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
    const next = value.trim();
    if (next) {
      existing.set(property, next);
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
    const selector = getSelectorForTarget(target);
    if (!selector) {
      return;
    }
    applyStylesToElement(target, modifiedBySelector.get(selector) ?? null);
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
