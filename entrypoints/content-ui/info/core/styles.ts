import $ from "jquery";
import INFO_STYLES_CONTROLS_FORMS from "../styles/controls-forms.styles.css?inline";
import INFO_STYLES_PANEL_LAYOUT from "../styles/panel-layout.styles.css?inline";
import INFO_STYLES_TOOLTIPS_OVERLAYS from "../styles/tooltips-overlays.styles.css?inline";
import INFO_STYLES_TREE_MEDIA from "../styles/tree-media.styles.css?inline";

const INFO_STYLE_ID = "wilderness-info-styles";
const INFO_STYLES = `${INFO_STYLES_PANEL_LAYOUT}${INFO_STYLES_TREE_MEDIA}${INFO_STYLES_CONTROLS_FORMS}${INFO_STYLES_TOOLTIPS_OVERLAYS}`;

/**
 * Injects bundled inspect CSS into the page DOM (outside the shadow root) so
 * overlays and panel chrome can style host-page mounted nodes.
 */
export const ensureInfoStyles = () => {
  if ($(`#${INFO_STYLE_ID}`).length > 0) {
    return;
  }

  const style = $("<style>").attr("id", INFO_STYLE_ID).text(INFO_STYLES);

  const parent = document.head ?? document.documentElement;
  if (!parent) {
    console.warn("[Info] Unable to inject styles: no document root.");
    return;
  }

  $(parent).append(style);
};

export const removeInfoStyles = () => {
  $(`#${INFO_STYLE_ID}`).remove();
};
