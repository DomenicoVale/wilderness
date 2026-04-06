import { clearActionState, setActionEnabled, setActionWarning } from "../lib/background/action-indicator";
import {
  initializeCustomToolBridge,
  injectCustomToolBridgeForTab,
  openCustomToolsEditorTab,
} from "../lib/custom-tools/background";
import type { CustomToolBridgeResponse } from "../lib/custom-tools/bridge";
import { ENSURE_CUSTOM_TOOL_BRIDGE_MESSAGE, OPEN_CUSTOM_TOOL_EDITOR_MESSAGE } from "../lib/custom-tools/messages";
import { SET_UI_MESSAGE } from "../lib/events";

const CONTENT_SCRIPT_FILE = "content-scripts/content.js";
const CONSOLE_INTERCEPTOR_FILE = "console-interceptor.js";

const UI_ENABLED_KEY = "wilderness:ui-enabled";

let uiEnabled = false;
let enabledStateLoaded = false;
/**
 * Register the console interceptor to run in MAIN world on all pages.
 * This captures console logs even before the extension UI is opened.
 */
const registerConsoleInterceptor = async () => {
  try {
    // Unregister first in case it already exists (during extension reload)
    await browser.scripting.unregisterContentScripts({ ids: ["wilderness-console-interceptor"] }).catch((error) => {
      console.warn("[wilderness] Failed to unregister console interceptor.", error);
    });

    await browser.scripting.registerContentScripts([
      {
        id: "wilderness-console-interceptor",
        matches: ["<all_urls>"],
        js: [CONSOLE_INTERCEPTOR_FILE],
        runAt: "document_start",
        world: "MAIN",
      },
    ]);
    console.info("[wilderness] Console interceptor registered.");
  } catch (error) {
    console.warn("[wilderness] Failed to register console interceptor:", error);
  }
};

const loadUiEnabledState = async () => {
  if (enabledStateLoaded) {
    return;
  }

  try {
    const stored = await browser.storage.local.get(UI_ENABLED_KEY);
    uiEnabled = stored[UI_ENABLED_KEY] === true;
  } catch (error) {
    console.warn("[wilderness] Failed to load enabled state.", error);
    uiEnabled = false;
  } finally {
    enabledStateLoaded = true;
  }
};

const persistUiEnabledState = async () => {
  try {
    await browser.storage.local.set({ [UI_ENABLED_KEY]: uiEnabled });
  } catch (error) {
    console.warn("[wilderness] Failed to persist enabled state.", error);
  }
};

const isSupportedPageUrl = (url?: string | null) => {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    console.warn("[wilderness] Unable to parse tab URL.", error);
    return false;
  }
};

const sendUiMessage = async (tabId: number, enabled: boolean) => {
  try {
    await browser.tabs.sendMessage(tabId, { type: SET_UI_MESSAGE, enabled });
    return true;
  } catch (error) {
    if (enabled) {
      console.warn("[wilderness] UI not yet injected, injecting now.", error);
    }
    return false;
  }
};

const injectContentScript = async (tabId: number) => {
  await browser.scripting.executeScript({
    target: { tabId },
    files: [CONTENT_SCRIPT_FILE],
  });
};

const getInjectionFailureReason = (error: unknown) => {
  const message = (error instanceof Error ? error.message : typeof error === "string" ? error : "").toLowerCase();

  if (message.includes("cannot access contents of the page")) {
    return "This page blocks extension scripts.";
  }

  if (message.includes("permission") || message.includes("access denied")) {
    return "Site access is blocked for this page.";
  }

  return "Unable to inject toolbar on this page.";
};

const ensureUiForTab = async (tabId: number): Promise<string | null> => {
  const sent = await sendUiMessage(tabId, true);
  if (sent) {
    return null;
  }

  try {
    await injectContentScript(tabId);
  } catch (error) {
    console.warn("[wilderness] Failed to inject content script.", error);
    return getInjectionFailureReason(error);
  }

  const sentAfter = await sendUiMessage(tabId, true);
  if (!sentAfter) {
    console.warn("[wilderness] Unable to enable UI after injection.");
    return "Toolbar channel did not respond after injection.";
  }

  return null;
};

const disableUiForTab = async (tabId: number) => {
  await sendUiMessage(tabId, false);
};

const setUiEnabled = async (next: boolean) => {
  uiEnabled = next;
  await persistUiEnabledState();
};

const updateActionStateForTab = async (tabId: number, url?: string | null, warning?: string | null) => {
  if (warning) {
    await setActionWarning(tabId, warning, uiEnabled);
    return;
  }

  if (!uiEnabled) {
    await clearActionState(tabId);
    return;
  }

  if (!isSupportedPageUrl(url)) {
    await setActionWarning(tabId, "Open an HTTP(S) page to use the extension.", uiEnabled);
    return;
  }

  await setActionEnabled(tabId);
};

const syncTabForEnabledState = async (tab: { id?: number; url?: string | null; active?: boolean }) => {
  if (!tab.id) {
    return;
  }

  if (!uiEnabled) {
    if (isSupportedPageUrl(tab.url)) {
      await disableUiForTab(tab.id);
    }
    await clearActionState(tab.id);
    return;
  }

  if (!isSupportedPageUrl(tab.url)) {
    if (tab.active) {
      await setActionWarning(tab.id, "Open an HTTP(S) page to use the extension.", uiEnabled);
    } else {
      await clearActionState(tab.id);
    }
    return;
  }

  const reason = await ensureUiForTab(tab.id);
  await updateActionStateForTab(tab.id, tab.url, reason);
};

const syncAllTabsForEnabledState = async () => {
  const tabs = await browser.tabs.query({});
  await Promise.all(tabs.map((tab) => syncTabForEnabledState(tab)));
};

export default defineBackground(() => {
  // Register console interceptor on extension startup
  void registerConsoleInterceptor();
  void initializeCustomToolBridge();
  void loadUiEnabledState().then(() => syncAllTabsForEnabledState());

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) {
      console.warn("[wilderness] Missing tab id for action click.");
      return;
    }

    await loadUiEnabledState();

    console.info("[wilderness] Action clicked, toggling UI.");
    const nextEnabled = !uiEnabled;
    await setUiEnabled(nextEnabled);

    if (!nextEnabled) {
      await syncAllTabsForEnabledState();
      return;
    }

    if (!isSupportedPageUrl(tab.url)) {
      await setActionWarning(tab.id, "Enabled. Open an HTTP(S) page to use the extension.", uiEnabled);
      await syncAllTabsForEnabledState();
      return;
    }

    await syncAllTabsForEnabledState();
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === OPEN_CUSTOM_TOOL_EDITOR_MESSAGE) {
      void openCustomToolsEditorTab();
      return;
    }

    if (message?.type !== ENSURE_CUSTOM_TOOL_BRIDGE_MESSAGE) {
      return;
    }

    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({
        ok: false,
        error: "Missing tab id for custom tool bridge injection.",
      } satisfies CustomToolBridgeResponse);
      return;
    }

    void injectCustomToolBridgeForTab(tabId).then((response: CustomToolBridgeResponse) => {
      sendResponse(response);
    });
    return true;
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "loading") {
      return;
    }

    await loadUiEnabledState();
    if (!uiEnabled) {
      await clearActionState(tabId);
      return;
    }

    if (!isSupportedPageUrl(tab.url)) {
      if (tab.active) {
        await setActionWarning(tabId, "Open an HTTP(S) page to use the extension.", uiEnabled);
      } else {
        await clearActionState(tabId);
      }
      return;
    }

    const reason = await ensureUiForTab(tabId);
    await updateActionStateForTab(tabId, tab.url, reason);
  });

  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    await loadUiEnabledState();
    const tab = await browser.tabs.get(tabId);
    if (!uiEnabled) {
      await clearActionState(tabId);
      return;
    }

    if (!isSupportedPageUrl(tab.url)) {
      await setActionWarning(tabId, "Open an HTTP(S) page to use the extension.", uiEnabled);
      return;
    }

    const reason = await ensureUiForTab(tabId);
    await updateActionStateForTab(tabId, tab.url, reason);
  });
});
