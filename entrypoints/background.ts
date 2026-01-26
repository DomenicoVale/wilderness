import { OPEN_CUSTOM_TOOL_EDITOR_MESSAGE, SET_UI_MESSAGE } from "../lib/events";

const CONTENT_SCRIPT_FILE = "content-scripts/content.js";
const CONSOLE_INTERCEPTOR_FILE = "console-interceptor.js";

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

const ensureUiForTab = async (tabId: number) => {
  const sent = await sendUiMessage(tabId, true);
  if (sent) {
    return;
  }

  try {
    await injectContentScript(tabId);
  } catch (error) {
    console.warn("[wilderness] Failed to inject content script.", error);
    return;
  }

  const sentAfter = await sendUiMessage(tabId, true);
  if (!sentAfter) {
    console.warn("[wilderness] Unable to enable UI after injection.");
  }
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

const openCustomToolsEditorTab = async () => {
  try {
    const url = new URL("custom-tools.html", browser.runtime.getURL("/")).toString();
    await browser.tabs.create({ url });
  } catch (error) {
    console.warn("[wilderness] Failed to open custom tools editor.", error);
  }
};

export default defineBackground(() => {
  // Register console interceptor on extension startup
  void registerConsoleInterceptor();
  void loadEnabledOrigins();

  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) {
      console.warn("[wilderness] Missing tab id for action click.");
      return;
    }

    await loadEnabledOrigins();

    const origin = getOriginFromUrl(tab.url);
    if (!origin) {
      console.warn("[wilderness] Unable to toggle UI for this URL.");
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
    await Promise.all(tabIds.map((id) => ensureUiForTab(id)));
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== OPEN_CUSTOM_TOOL_EDITOR_MESSAGE) {
      return;
    }

    void openCustomToolsEditorTab();
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

    await ensureUiForTab(tabId);
  });

  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    await loadEnabledOrigins();
    const tab = await browser.tabs.get(tabId);
    const origin = getOriginFromUrl(tab.url);
    if (!origin || !enabledOrigins.has(origin)) {
      return;
    }

    await ensureUiForTab(tabId);
  });
});
