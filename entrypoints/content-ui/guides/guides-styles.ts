import $ from "jquery";
import GUIDES_STYLES from "./guides.css?inline";

const GUIDES_STYLE_ID = "wilderness-guides-styles";
const GUIDES_ROOT_ID = "wilderness-guides-root";

export const ensureGuidesStyles = () => {
  if ($(`#${GUIDES_STYLE_ID}`).length > 0) {
    return;
  }

  const style = $("<style>").attr("id", GUIDES_STYLE_ID).text(GUIDES_STYLES);

  const parent = document.head ?? document.documentElement;
  if (!parent) {
    console.warn("[Guides] Unable to inject styles: no document root.");
    return;
  }

  $(parent).append(style);
};

export const removeGuidesStyles = () => {
  $(`#${GUIDES_STYLE_ID}`).remove();
};

export const ensureGuidesRoot = (): HTMLElement => {
  const existing = $(`#${GUIDES_ROOT_ID}`).get(0);
  if (existing instanceof HTMLElement) {
    return existing;
  }

  const root = $("<div>").attr("id", GUIDES_ROOT_ID).get(0);
  if (!(root instanceof HTMLElement)) {
    throw new Error("[Guides] Unable to create guides root element.");
  }
  const parent = document.documentElement ?? document.body;
  if (!parent) {
    console.warn("[Guides] Unable to mount guides root: no document root.");
  } else {
    $(parent).append(root);
  }
  return root;
};

export const removeGuidesRoot = () => {
  $(`#${GUIDES_ROOT_ID}`).remove();
};
