/// <reference path="../.wxt/wxt.d.ts" />

// TODO: refactor this file to be cleaner, remove unnecessary utils, move ui mounting logic to own file
// same thing for the console logic and controllers. The file should only contain the exported define content script.

import { createRoot } from "react-dom/client";
import { addConsoleEntry, isConsoleMessage } from "../lib/console-store";
import { createContentEventHandlers } from "../lib/content-events";
import { runCustomTool } from "../lib/custom-tools-runner";
import { ensureCustomToolsStore, getActiveCustomTools, waitForCustomToolsReady } from "../lib/custom-tools-store";
import { SET_UI_MESSAGE } from "../lib/events";
import { ContentToolbar } from "./content-ui/content-toolbar";
import { createGuidesController } from "./content-ui/guides/guides-tool";
import { createInfoController } from "./content-ui/info/info-tool";
import { getToolState, setToolState } from "./content-ui/tool-state";
import "./content-ui/style.css";
type ContentScriptContextType = InstanceType<typeof ContentScriptContext>;
const CONTENT_SCRIPT_SINGLETON_KEY = "__wilderness_content_singleton__";

let contentUi: ShadowRootContentScriptUi<ReturnType<typeof createRoot>> | null = null;
let isMounted = false;
let guidesController: ReturnType<typeof createGuidesController> | null = null;
let infoController: ReturnType<typeof createInfoController> | null = null;
let shouldMountUi = false;

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

const toggleConsolePanel = () => {
  const current = getToolState();
  setToolState({ consolePanelOpen: !current.consolePanelOpen });
};

/**
 * Handles messages from the console interceptor (MAIN world).
 * Validates the message source and adds entries to the console store.
 */
const handleConsoleMessage = (event: MessageEvent) => {
  // Only accept messages from the same window
  if (event.source !== window) {
    return;
  }

  if (!isConsoleMessage(event.data)) {
    return;
  }

  addConsoleEntry(event.data);
};

const ensureBody = async () => {
  if (document.body) {
    return;
  }

  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.body) {
        return;
      }

      observer.disconnect();
      resolve();
    });

    const target = document.documentElement ?? document;
    observer.observe(target, { childList: true, subtree: true });
  });
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

  await ensureBody();
  const ui = await ensureUi(ctx);
  ui.mount();
  isMounted = true;
};

const unmountUi = () => {
  guidesController?.disable();
  infoController?.disable();
  setToolState({
    guidesEnabled: false,
    infoEnabled: false,
    consolePanelOpen: false,
  });

  if (!contentUi || !isMounted) {
    return;
  }

  contentUi.remove();
  isMounted = false;
};

const startNavigationWatcher = (ctx: ContentScriptContextType) => {
  const isShadowHostPresent = () => !!document.querySelector("wilderness-toolbar");

  const handleNavigation = () => {
    setTimeout(() => {
      if (!shouldMountUi) {
        return;
      }

      if (!isShadowHostPresent()) {
        contentUi = null;
        isMounted = false;
        void mountUi(ctx);
      }
    }, 50);
  };

  window.addEventListener("popstate", handleNavigation);

  const origPushState = history.pushState.bind(history);
  history.pushState = (...args: Parameters<typeof history.pushState>) => {
    origPushState(...args);
    handleNavigation();
  };

  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
    origReplaceState(...args);
    handleNavigation();
  };

  const observer = new MutationObserver(handleNavigation);
  const observeTarget = document.body ?? document.documentElement;
  if (observeTarget) {
    observer.observe(observeTarget, { childList: true });
  }
};

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  runAt: "document_start",
  registration: "runtime",
  async main(ctx) {
    const contentGlobal = globalThis as typeof globalThis & {
      [CONTENT_SCRIPT_SINGLETON_KEY]?: boolean;
    };

    if (contentGlobal[CONTENT_SCRIPT_SINGLETON_KEY]) {
      console.warn("[wilderness] Duplicate content script injection ignored.");
      return;
    }
    contentGlobal[CONTENT_SCRIPT_SINGLETON_KEY] = true;

    ensureCustomToolsStore();

    browser.runtime.onMessage.addListener((message) => {
      if (message?.type !== SET_UI_MESSAGE) {
        return;
      }

      if (typeof message.enabled !== "boolean") {
        console.warn("[wilderness] Missing enabled flag for UI message.");
        return;
      }

      shouldMountUi = message.enabled;
      if (message.enabled) {
        void mountUi(ctx);
        return;
      }

      unmountUi();
    });

    const eventHandlers = createContentEventHandlers({
      ensureGuidesController,
      ensureInfoController,
      getGuidesController: () => guidesController,
      getInfoController: () => infoController,
      disableGuides,
      disableInfo,
      toggleConsolePanel,
    });

    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      window.addEventListener(eventName, handler);
    });

    // Listen for console messages from the MAIN world interceptor
    window.addEventListener("message", handleConsoleMessage);

    const runActiveToolOnLoad = async () => {
      const snapshot = await waitForCustomToolsReady();
      if (snapshot.status !== "ready") {
        return;
      }

      const activeTools = getActiveCustomTools().filter((tool) => tool.mode === "on-load");
      if (activeTools.length === 0) {
        return;
      }

      for (const tool of activeTools) {
        await runCustomTool({ tool, reason: "load" });
      }
    };

    void runActiveToolOnLoad();
    startNavigationWatcher(ctx);
  },
});
