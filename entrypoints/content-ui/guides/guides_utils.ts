const TOOLBAR_HOST = "wilderness-toolbar";

const isToolbarElement = (el: Element) => {
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

const isGuidesElement = (el: Element) =>
  el.closest("wilderness-guide-box, wilderness-distance, wilderness-gridlines");

export const isOffBounds = (node: Element | null) => {
  if (!node) {
    return true;
  }

  if (isToolbarElement(node)) {
    return true;
  }

  if (isGuidesElement(node)) {
    return true;
  }

  return node === document.documentElement || node === document.body;
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
