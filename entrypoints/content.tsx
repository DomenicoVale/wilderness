/// <reference path="../.wxt/wxt.d.ts" />

import { createRoot } from "react-dom/client";
import { ContentToolbar } from "./content-ui/content-toolbar";
import { createGuidesController } from "./content-ui/guides/guides-tool";
import { createInfoController } from "./content-ui/info/info-tool";
import { setToolState } from "./content-ui/tool-state";
import { createContentEventHandlers } from "../lib/content-events";
import { TOGGLE_UI_MESSAGE } from "../lib/events";
import "./content-ui/style.css";
type ContentScriptContextType = InstanceType<typeof ContentScriptContext>;

let contentUi: ShadowRootContentScriptUi<ReturnType<typeof createRoot>> | null =
  null;
let isMounted = false;
let guidesController: ReturnType<typeof createGuidesController> | null = null;
let infoController: ReturnType<typeof createInfoController> | null = null;

const disableGuides = () => {
  if (!guidesController) {
    return;
  }

  const next = guidesController.toggle(false);
  setToolState({ guidesEnabled: next });
};

const disableInfo = () => {
  if (!infoController) {
    return;
  }

  const next = infoController.toggle(false);
  setToolState({ infoEnabled: next });
};

const ensureGuidesController = () => {
  if (!guidesController) {
    guidesController = createGuidesController();
  }

  return guidesController;
};

const ensureInfoController = () => {
  if (!infoController) {
    infoController = createInfoController();
  }

  return infoController;
};

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

    const eventHandlers = createContentEventHandlers({
      ensureGuidesController,
      ensureInfoController,
      getGuidesController: () => guidesController,
      getInfoController: () => infoController,
      disableGuides,
      disableInfo,
    });

    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      window.addEventListener(eventName, handler);
    });
  },
});
