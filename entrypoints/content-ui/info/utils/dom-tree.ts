import $ from "jquery";
import { isInfoUiElement } from "./common";

export const NON_TREE_TAGS = new Set(["SCRIPT", "STYLE", "META", "LINK", "NOSCRIPT", "TEMPLATE", "TITLE", "BASE"]);

export const getElementTreePath = (element: Element) => {
  const path: Element[] = [];
  let current: Element | null = element;
  while (current) {
    path.unshift(current);
    current = current.parentElement;
  }
  return path;
};

export const getTreeLabel = (element: Element) => {
  const tag = element.tagName.toLowerCase();
  const idValue = $(element).attr("id");
  const id = idValue ? `#${idValue}` : "";
  const classAttr = ($(element).attr("class") ?? "").trim();
  const classPart = classAttr ? `.${classAttr.split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${tag}${id}${classPart}`;
};

export const getTreeChildren = (node: Element) =>
  $(node)
    .children()
    .toArray()
    .filter(
      (child) =>
        !isInfoUiElement(child) && !child.hasAttribute("data-wilderness-info") && !NON_TREE_TAGS.has(child.tagName.toUpperCase())
    );
