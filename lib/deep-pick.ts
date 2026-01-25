export type DeepTarget = Element | Range;

let warnedUnsupportedCaret = false;

const deepElementFromPoint = (x: number, y: number) => {
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

const createRangeFromTextNode = (node: Node) => {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range;
};

// Prefer caret APIs to find a text node under the pointer.
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
      return createRangeFromTextNode(node);
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
      return createRangeFromTextNode(node);
    }

    if (node instanceof Element) {
      return node;
    }

    return null;
  }

  if (!warnedUnsupportedCaret) {
    warnedUnsupportedCaret = true;
    console.warn("[Wilderness] Deep selection is not supported in this browser.");
  }

  return null;
};

// Pick an element or text range under the pointer.
export const getDeepTargetFromPoint = (x: number, y: number, preferDeepest: boolean) => {
  if (!preferDeepest) {
    return deepElementFromPoint(x, y);
  }

  const caretTarget = getCaretTarget(x, y);
  if (caretTarget) {
    return caretTarget;
  }

  return deepElementFromPoint(x, y);
};

// Convert a DeepTarget to a concrete element when needed.
export const getElementForTarget = (target: DeepTarget | null) => {
  if (!target) {
    return null;
  }

  if (target instanceof Element) {
    return target;
  }

  const container = target.commonAncestorContainer;
  if (container instanceof Element) {
    return container;
  }

  return container.parentElement;
};

// Alt/Command indicates deep picking for text nodes.
export const isDeepPickEvent = (event: MouseEvent) => event.altKey || event.metaKey;

// Provide a rect for both elements and text ranges.
export const getTargetRect = (target: DeepTarget) => {
  if (target instanceof Element) {
    return target.getBoundingClientRect();
  }

  return target.getBoundingClientRect();
};
