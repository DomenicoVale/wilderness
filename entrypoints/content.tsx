/// <reference path="../.wxt/wxt.d.ts" />

import { createRoot } from "react-dom/client";
import { ContentToolbar } from "./content-ui/content-toolbar";
import {
  createGuidesController,
  type GuidesSettings,
} from "./content-ui/guides/guides_tool";
import "./content-ui/style.css";

const TOGGLE_UI_MESSAGE = "wilderness:toggle-ui";
const TOGGLE_GUIDES_EVENT = "wilderness:toggle-guides";
const GUIDES_SETTINGS_EVENT = "wilderness:guides-settings";

type ContentScriptContextType = InstanceType<typeof ContentScriptContext>;

let contentUi: ShadowRootContentScriptUi<ReturnType<typeof createRoot>> | null =
  null;
let isMounted = false;
let guidesController: ReturnType<typeof createGuidesController> | null = null;

const ensureUi = async (ctx: ContentScriptContextType) => {
  if (contentUi) {
    return contentUi;
  }

  contentUi = await createShadowRootUi(ctx, {
    name: "wilderness-toolbar",
    position: "inline",
    anchor: "body",
    onMount: (container) => {
      const app = document.createElement("div");
      container.append(app);

      const root = createRoot(app);
      root.render(<ContentToolbar />);
      return root;
    },
    onRemove: (root) => {
      if (!root) {
        console.warn("[wilderness] Content UI root missing on cleanup.");
        return;
      }

      root.unmount();
    },
  });

  return contentUi;
};

const mountUi = async (ctx: ContentScriptContextType) => {
  if (isMounted) {
    return;
  }

  const ui = await ensureUi(ctx);
  ui.mount();
  isMounted = true;
};

const unmountUi = () => {
  if (!contentUi || !isMounted) {
    return;
  }

  guidesController?.disable();
  contentUi.remove();
  isMounted = false;
};

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  registration: "runtime",
  async main(ctx) {
    browser.runtime.onMessage.addListener((message) => {
      if (message?.type !== TOGGLE_UI_MESSAGE) {
        return;
      }

      if (isMounted) {
        unmountUi();
        return;
      }

      void mountUi(ctx);
    });

    window.addEventListener(TOGGLE_GUIDES_EVENT, (event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const enabled =
        typeof detail?.enabled === "boolean" ? detail.enabled : undefined;

      if (!guidesController) {
        guidesController = createGuidesController();
      }

      guidesController.toggle(enabled);
    });

    window.addEventListener(GUIDES_SETTINGS_EVENT, (event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      if (!guidesController || !detail) {
        return;
      }

      guidesController.updateSettings(detail as Partial<GuidesSettings>);
    });
  },
});
