const TOOLBAR_HOST = "wilderness-toolbar";

export const isToolbarElement = (el: Element) => {
  if (el.closest(TOOLBAR_HOST)) {
    return true;
  }

  const rootNode = el.getRootNode();
  if (
    rootNode instanceof ShadowRoot &&
    rootNode.host?.tagName?.toLowerCase() === TOOLBAR_HOST
  ) {
    return true;
  }

  return false;
};

export const isGuidesElement = (el: Element) =>
  el.closest("wilderness-guide-box, wilderness-distance, wilderness-gridlines");

export const isGuidesUiElement = (el: Element) =>
  isToolbarElement(el) || isGuidesElement(el);

const getElementForBounds = (node: Element | Range | null) => {
  if (!node) {
    return null;
  }

  if (node instanceof Element) {
    return node;
  }

  const container = node.commonAncestorContainer;
  if (container instanceof Element) {
    return container;
  }

  return container.parentElement;
};

export const isOffBounds = (node: Element | Range | null) => {
  const element = getElementForBounds(node);
  if (!element) {
    return true;
  }

  if (isToolbarElement(element)) {
    return true;
  }

  if (isGuidesElement(element)) {
    return true;
  }

  return element === document.documentElement || element === document.body;
};

export const deepElementFromPoint = (x: number, y: number) => {
  const element = document.elementFromPoint(x, y);
  if (!element) {
    return null;
  }

  const crawlShadows = (node: Element): Element => {
    const shadowRoot = (node as HTMLElement).shadowRoot;
    if (!shadowRoot) {
      return node;
    }

    const nested = shadowRoot.elementFromPoint(x, y);
    if (!nested || nested === node) {
      return node;
    }

    if ((nested as HTMLElement).shadowRoot) {
      return crawlShadows(nested);
    }

    return nested;
  };

  return crawlShadows(element);
};

let warnedUnsupportedCaret = false;

const getCaretTarget = (x: number, y: number) => {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (typeof doc.caretPositionFromPoint === "function") {
    const caret = doc.caretPositionFromPoint(x, y);
    const node = caret?.offsetNode ?? null;
    if (!node) {
      return null;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range;
    }

    if (node instanceof Element) {
      return node;
    }

    return null;
  }

  if (typeof doc.caretRangeFromPoint === "function") {
    const range = doc.caretRangeFromPoint(x, y);
    const node = range?.startContainer ?? null;
    if (!node) {
      return null;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range;
    }

    if (node instanceof Element) {
      return node;
    }

    return null;
  }

  if (!warnedUnsupportedCaret) {
    warnedUnsupportedCaret = true;
    console.warn("[Guides] Deep selection is not supported in this browser.");
  }

  return null;
};

export const targetElementFromPoint = (
  x: number,
  y: number,
  preferDeepest: boolean,
) => {
  if (!preferDeepest) {
    return deepElementFromPoint(x, y);
  }

  const caretTarget = getCaretTarget(x, y);
  if (caretTarget) {
    return caretTarget;
  }

  return deepElementFromPoint(x, y);
};

export const getTargetRect = (target: Element | Range) => {
  if (target instanceof Element) {
    return target.getBoundingClientRect();
  }

  return target.getBoundingClientRect();
};
