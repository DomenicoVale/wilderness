import $ from "jquery";
import {
  type DeepTarget,
  getTargetRect as getDeepTargetRect,
  getElementForTarget,
  type TargetRectSpace,
} from "../../../lib/deep-pick";

const TOOLBAR_HOST = "wilderness-toolbar";

export const isToolbarElement = (el: Element) => {
  if ($(el).closest(TOOLBAR_HOST).length > 0) {
    return true;
  }

  const rootNode = el.getRootNode();
  if (rootNode instanceof ShadowRoot && rootNode.host?.tagName?.toLowerCase() === TOOLBAR_HOST) {
    return true;
  }

  return false;
};

export const isGuidesElement = (el: Element) =>
  $(el).closest("wilderness-guide-box, wilderness-distance, wilderness-gridlines, .wilderness-info-tip, .wilderness-info-outline")
    .length > 0;

export const isGuidesUiElement = (el: Element) => isToolbarElement(el) || isGuidesElement(el);

export const isOffBounds = (node: DeepTarget | null) => {
  const element = getElementForTarget(node);
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

export const getTargetRect = (target: Element | Range, space: TargetRectSpace = "viewport") => getDeepTargetRect(target, space);
