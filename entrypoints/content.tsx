/// <reference path="../.wxt/wxt.d.ts" />

// TODO: refactor this file to be cleaner, remove unnecessary utils, move ui mounting logic to own file
// same thing for the console logic and controllers. The file should only contain the exported define content script.

import { createRoot } from "react-dom/client";
import { addConsoleEntry, isConsoleMessage } from "../lib/console-store";
import { createContentEventHandlers } from "../lib/content-events";
import { runCustomTool } from "../lib/custom-tools-runner";
import {
  type CustomTool,
  clearOnEnableActiveCustomToolIds,
  ensureCustomToolsStore,
  getCustomToolsSnapshot,
  subscribeCustomToolsSnapshot,
  waitForCustomToolsReady,
} from "../lib/custom-tools-store";
import { SET_UI_MESSAGE } from "../lib/events";
import { ContentToolbar } from "./content-ui/content-toolbar";
import { createGuidesController } from "./content-ui/guides/guides-tool";
import { createInfoController } from "./content-ui/info/info-tool";
import { getToolState, setToolState } from "./content-ui/tool-state";
import "./content-ui/style.css";
type ContentScriptContextType = InstanceType<typeof ContentScriptContext>;
type ContentUiType = ShadowRootContentScriptUi<ReturnType<typeof createRoot>>;
type ContentScriptSingleton = {
  cleanup: () => void;
};
const CONTENT_SCRIPT_SINGLETON_KEY = "__wilderness_content_singleton__";
const STALE_UI_SELECTORS = [
  "wilderness-toolbar",
  ".wilderness-guide-box",
  ".wilderness-distance",
  ".wilderness-gridlines",
  ".wilderness-info-outline",
  ".wilderness-inspect-panel",
  ".wilderness-layout-overlay",
];
const STALE_STYLE_IDS = ["wilderness-guides-styles", "wilderness-info-styles"] as const;
const didCustomToolChange = (previous: CustomTool, next: CustomTool) =>
  previous.updatedAt !== next.updatedAt ||
  previous.name !== next.name ||
  previous.code !== next.code ||
  previous.mode !== next.mode;

let contentUi: ContentUiType | null = null;
let contentUiPromise: Promise<ContentUiType> | null = null;
let isMounted = false;
let guidesController: ReturnType<typeof createGuidesController> | null = null;
let infoController: ReturnType<typeof createInfoController> | null = null;
let shouldMountUi = false;
let uiEpoch = 0;

const removeStaleUiArtifacts = () => {
  STALE_UI_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  });

  STALE_STYLE_IDS.forEach((styleId) => {
    document.getElementById(styleId)?.remove();
  });
};

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

  if (contentUiPromise) {
    return contentUiPromise;
  }

  contentUiPromise = createShadowRootUi(ctx, {
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
  })
    .then((ui) => {
      contentUi = ui;
      return ui;
    })
    .finally(() => {
      contentUiPromise = null;
    });

  return contentUiPromise;
};

const mountUi = async (ctx: ContentScriptContextType, epoch: number) => {
  if (isMounted || !shouldMountUi || epoch !== uiEpoch) {
    return;
  }

  await ensureBody();
  if (isMounted || !shouldMountUi || epoch !== uiEpoch) {
    return;
  }

  const ui = await ensureUi(ctx);
  if (isMounted || !shouldMountUi || epoch !== uiEpoch) {
    return;
  }

  ui.mount();
  isMounted = true;
};

const unmountUi = () => {
  guidesController?.disable();
  infoController?.disable();
  guidesController = null;
  infoController = null;
  setToolState({
    guidesEnabled: false,
    infoEnabled: false,
    consolePanelOpen: false,
  });

  if (contentUi && isMounted) {
    contentUi.remove();
  }

  isMounted = false;
  contentUi = null;
  removeStaleUiArtifacts();
};

const startNavigationWatcher = (ctx: ContentScriptContextType) => {
  const isShadowHostPresent = () => !!document.querySelector("wilderness-toolbar");
  let navigationTimeoutId: number | null = null;

  const handleNavigation = () => {
    if (navigationTimeoutId !== null) {
      window.clearTimeout(navigationTimeoutId);
    }

    navigationTimeoutId = window.setTimeout(() => {
      navigationTimeoutId = null;
      if (!shouldMountUi) {
        return;
      }

      if (!isShadowHostPresent()) {
        contentUi = null;
        isMounted = false;
        void mountUi(ctx, uiEpoch);
      }
    }, 50);
  };

  window.addEventListener("popstate", handleNavigation);

  const origPushState = history.pushState.bind(history);
  const wrappedPushState = (...args: Parameters<typeof history.pushState>) => {
    origPushState(...args);
    handleNavigation();
  };
  history.pushState = wrappedPushState;

  const origReplaceState = history.replaceState.bind(history);
  const wrappedReplaceState = (...args: Parameters<typeof history.replaceState>) => {
    origReplaceState(...args);
    handleNavigation();
  };
  history.replaceState = wrappedReplaceState;

  const observer = new MutationObserver(handleNavigation);
  const observeTarget = document.body ?? document.documentElement;
  if (observeTarget) {
    observer.observe(observeTarget, { childList: true });
  }

  return () => {
    if (navigationTimeoutId !== null) {
      window.clearTimeout(navigationTimeoutId);
      navigationTimeoutId = null;
    }
    window.removeEventListener("popstate", handleNavigation);
    observer.disconnect();
    if (history.pushState === wrappedPushState) {
      history.pushState = origPushState;
    }
    if (history.replaceState === wrappedReplaceState) {
      history.replaceState = origReplaceState;
    }
  };
};

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  runAt: "document_start",
  registration: "runtime",
  async main(ctx) {
    const contentGlobal = globalThis as typeof globalThis & {
      [CONTENT_SCRIPT_SINGLETON_KEY]?: ContentScriptSingleton;
    };

    contentGlobal[CONTENT_SCRIPT_SINGLETON_KEY]?.cleanup();
    let isCleanedUp = false;
    const appliedCustomTools = new Map<string, CustomTool>();
    let hasSyncedCustomTools = false;
    let lastKnownActiveToolIds = new Set<string>();
    let customToolSyncQueue = Promise.resolve();

    ensureCustomToolsStore();

    const handleRuntimeMessage = (message: unknown) => {
      const payload = message as { type?: unknown; enabled?: unknown };
      if (payload.type !== SET_UI_MESSAGE) {
        return;
      }

      if (typeof payload.enabled !== "boolean") {
        console.warn("[wilderness] Missing enabled flag for UI message.");
        return;
      }

      shouldMountUi = payload.enabled;
      if (payload.enabled) {
        uiEpoch += 1;
        void mountUi(ctx, uiEpoch);
        return;
      }

      uiEpoch += 1;
      unmountUi();
    };
    browser.runtime.onMessage.addListener(handleRuntimeMessage);

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

    const removeEventHandlers = () => {
      Object.entries(eventHandlers).forEach(([eventName, handler]) => {
        window.removeEventListener(eventName, handler);
      });
    };

    // Listen for console messages from the MAIN world interceptor
    window.addEventListener("message", handleConsoleMessage);

    const cleanupAppliedCustomTools = async () => {
      const tools = Array.from(appliedCustomTools.values());
      appliedCustomTools.clear();

      for (const tool of tools) {
        await runCustomTool({ tool, reason: "disable", action: "cleanup" });
      }
    };

    const syncCustomTools = async () => {
      if (isCleanedUp) {
        return;
      }

      const snapshot = getCustomToolsSnapshot();
      if (snapshot.status !== "ready") {
        return;
      }

      const nextActiveToolIds = new Set(snapshot.activeToolIds);
      const toolsById = new Map(snapshot.tools.map((tool) => [tool.id, tool]));

      if (!hasSyncedCustomTools) {
        hasSyncedCustomTools = true;
        lastKnownActiveToolIds = new Set(nextActiveToolIds);

        for (const tool of snapshot.tools) {
          if (!nextActiveToolIds.has(tool.id) || tool.mode !== "on-extension-load") {
            continue;
          }

          const didSetup = await runCustomTool({ tool, reason: "load", action: "setup" });
          if (didSetup) {
            appliedCustomTools.set(tool.id, tool);
          }
        }

        return;
      }

      for (const toolId of lastKnownActiveToolIds) {
        if (nextActiveToolIds.has(toolId)) {
          continue;
        }

        const tool = appliedCustomTools.get(toolId) ?? toolsById.get(toolId);
        if (!tool) {
          continue;
        }

        await runCustomTool({ tool, reason: "disable", action: "cleanup" });
        appliedCustomTools.delete(toolId);
      }

      for (const toolId of nextActiveToolIds) {
        const tool = toolsById.get(toolId);
        if (!tool) {
          continue;
        }

        const wasActive = lastKnownActiveToolIds.has(toolId);
        const previousTool = appliedCustomTools.get(toolId);
        if (wasActive && previousTool && !didCustomToolChange(previousTool, tool)) {
          continue;
        }

        const didSetup = await runCustomTool({ tool, reason: wasActive ? "enable" : "enable", action: "setup" });
        if (didSetup) {
          appliedCustomTools.set(tool.id, tool);
          continue;
        }

        appliedCustomTools.delete(tool.id);
      }

      lastKnownActiveToolIds = nextActiveToolIds;
    };

    const queueCustomToolSync = () => {
      customToolSyncQueue = customToolSyncQueue
        .then(() => syncCustomTools())
        .catch((error) => {
          console.warn("[wilderness] Failed to sync custom tools for this page.", error);
        });
    };

    const unsubscribeCustomTools = subscribeCustomToolsSnapshot(() => {
      queueCustomToolSync();
    });

    void waitForCustomToolsReady().then(() => {
      queueCustomToolSync();
    });

    const stopNavigationWatcher = startNavigationWatcher(ctx);

    const cleanup = () => {
      if (isCleanedUp) {
        return;
      }
      isCleanedUp = true;

      shouldMountUi = false;
      uiEpoch += 1;
      stopNavigationWatcher();
      unsubscribeCustomTools();
      removeEventHandlers();
      window.removeEventListener("message", handleConsoleMessage);
      browser.runtime.onMessage.removeListener(handleRuntimeMessage);
      void cleanupAppliedCustomTools().finally(() => {
        void clearOnEnableActiveCustomToolIds();
      });
      unmountUi();

      if (contentGlobal[CONTENT_SCRIPT_SINGLETON_KEY]?.cleanup === cleanup) {
        delete contentGlobal[CONTENT_SCRIPT_SINGLETON_KEY];
      }
    };

    contentGlobal[CONTENT_SCRIPT_SINGLETON_KEY] = { cleanup };
    ctx.onInvalidated(cleanup);
  },
});
