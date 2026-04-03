import {
  initializeCustomToolBridge,
  injectCustomToolBridgeForTab,
  openCustomToolsEditorTab,
} from "../lib/custom-tools/background";
import type { CustomToolBridgeResponse } from "../lib/custom-tools/bridge";
import { ENSURE_CUSTOM_TOOL_BRIDGE_MESSAGE, OPEN_CUSTOM_TOOL_EDITOR_MESSAGE } from "../lib/custom-tools/messages";
import { SET_UI_MESSAGE } from "../lib/events";

// TODO: refactor this file to leave only the exported defineBackground function
// move the rest into their own logical folders and files.

const CONTENT_SCRIPT_FILE = "content-scripts/content.js";
const CONSOLE_INTERCEPTOR_FILE = "console-interceptor.js";
const DEFAULT_ACTION_TITLE = "wilderness";
const ACTION_WARNING_BADGE_TEXT = "!";
const ACTION_WARNING_BADGE_COLOR = "#f59e0b";

const ENABLED_ORIGINS_KEY = "wilderness:enabled-origins";

let enabledOrigins = new Set<string>();
let originsLoaded = false;
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

const loadEnabledOrigins = async () => {
  if (originsLoaded) {
    return;
  }

  try {
    const stored = await browser.storage.local.get(ENABLED_ORIGINS_KEY);
    const origins = Array.isArray(stored[ENABLED_ORIGINS_KEY])
      ? stored[ENABLED_ORIGINS_KEY].filter((value) => typeof value === "string")
      : [];
    enabledOrigins = new Set(origins);
  } catch (error) {
    console.warn("[wilderness] Failed to load enabled origins.", error);
    enabledOrigins = new Set();
  } finally {
    originsLoaded = true;
  }
};

const persistEnabledOrigins = async () => {
  try {
    await browser.storage.local.set({
      [ENABLED_ORIGINS_KEY]: Array.from(enabledOrigins),
    });
  } catch (error) {
    console.warn("[wilderness] Failed to persist enabled origins.", error);
  }
};

const getOriginFromUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.origin;
  } catch (error) {
    console.warn("[wilderness] Unable to parse tab URL.", error);
    return null;
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

const setActionWarning = async (tabId: number, message: string) => {
  try {
    await browser.action.setBadgeBackgroundColor({ tabId, color: ACTION_WARNING_BADGE_COLOR });
    await browser.action.setBadgeText({ tabId, text: ACTION_WARNING_BADGE_TEXT });
    await browser.action.setTitle({ tabId, title: `${DEFAULT_ACTION_TITLE}: ${message}` });
  } catch (error) {
    console.warn("[wilderness] Failed to set action warning.", error);
  }
};

const clearActionWarning = async (tabId: number) => {
  try {
    await browser.action.setBadgeText({ tabId, text: "" });
    await browser.action.setTitle({ tabId, title: DEFAULT_ACTION_TITLE });
  } catch (error) {
    console.warn("[wilderness] Failed to clear action warning.", error);
  }
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
  const sent = await sendUiMessage(tabId, false);
  if (!sent) {
    console.warn("[wilderness] Unable to disable UI for this tab.");
  }
};

const getTabsForOrigin = async (origin: string) => {
  const tabs = await browser.tabs.query({});
  return tabs.filter((tab) => tab.id && getOriginFromUrl(tab.url) === origin);
};

const enableOrigin = async (origin: string) => {
  enabledOrigins.add(origin);
  await persistEnabledOrigins();
};

const disableOrigin = async (origin: string) => {
  enabledOrigins.delete(origin);
  await persistEnabledOrigins();
};

export default defineBackground(() => {
  // Register console interceptor on extension startup
  void registerConsoleInterceptor();
  void initializeCustomToolBridge();
  void loadEnabledOrigins();

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) {
      console.warn("[wilderness] Missing tab id for action click.");
      return;
    }

    await clearActionWarning(tab.id);
    await loadEnabledOrigins();

    const origin = getOriginFromUrl(tab.url);
    if (!origin) {
      console.warn("[wilderness] Unable to toggle UI for this URL.");
      await setActionWarning(tab.id, "Open an HTTP(S) page and try again.");
      return;
    }

    console.info("[wilderness] Action clicked, toggling UI.");
    if (enabledOrigins.has(origin)) {
      await disableOrigin(origin);
      const tabs = await getTabsForOrigin(origin);
      const tabIds = tabs.flatMap((item) => (item.id ? [item.id] : []));
      await Promise.all(tabIds.map((id) => disableUiForTab(id)));
      return;
    }

    await enableOrigin(origin);
    const tabs = await getTabsForOrigin(origin);
    const tabIds = tabs.flatMap((item) => (item.id ? [item.id] : []));
    const results = await Promise.all(
      tabIds.map(async (id) => ({
        id,
        reason: await ensureUiForTab(id),
      }))
    );

    const activeTabResult = results.find((result) => result.id === tab.id);
    if (activeTabResult?.reason) {
      await setActionWarning(tab.id, activeTabResult.reason);
      return;
    }

    await clearActionWarning(tab.id);
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

    await loadEnabledOrigins();
    const origin = getOriginFromUrl(tab.url);
    if (!origin || !enabledOrigins.has(origin)) {
      return;
    }

    const reason = await ensureUiForTab(tabId);
    if (tab.active && reason) {
      await setActionWarning(tabId, reason);
    }
  });

  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    await loadEnabledOrigins();
    const tab = await browser.tabs.get(tabId);
    const origin = getOriginFromUrl(tab.url);
    if (!origin || !enabledOrigins.has(origin)) {
      return;
    }

    const reason = await ensureUiForTab(tabId);
    if (reason) {
      await setActionWarning(tabId, reason);
      return;
    }

    await clearActionWarning(tabId);
  });
});
