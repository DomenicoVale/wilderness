import { TOGGLE_UI_MESSAGE } from "../lib/events";
const CONTENT_SCRIPT_FILE = "content-scripts/content.js";

const enabledTabs = new Set<number>();

const sendToggleMessage = async (tabId: number) => {
  await browser.tabs.sendMessage(tabId, { type: TOGGLE_UI_MESSAGE });
};

const injectContentScript = async (tabId: number) => {
  await browser.scripting.executeScript({
    target: { tabId },
    files: [CONTENT_SCRIPT_FILE],
  });
};

const toggleForTab = async (tabId: number) => {
  if (enabledTabs.has(tabId)) {
    try {
      await sendToggleMessage(tabId);
      enabledTabs.delete(tabId);
      return;
    } catch (error) {
      console.warn("[wilderness] Unable to disable UI for this tab.", error);
      enabledTabs.delete(tabId);
      return;
    }
  }

  try {
    await sendToggleMessage(tabId);
    enabledTabs.add(tabId);
    return;
  } catch (error) {
    console.warn("[wilderness] UI not yet injected, injecting now.", error);
  }

  try {
    await injectContentScript(tabId);
  } catch (error) {
    console.warn("[wilderness] Failed to inject content script.", error);
    return;
  }

  try {
    await sendToggleMessage(tabId);
    enabledTabs.add(tabId);
  } catch (error) {
    console.warn("[wilderness] Unable to enable UI after injection.", error);
  }
};

export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) {
      console.warn("[wilderness] Missing tab id for action click.");
      return;
    }

    console.info("[wilderness] Action clicked, toggling UI.");
    await toggleForTab(tab.id);
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    enabledTabs.delete(tabId);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== "loading") {
      return;
    }

    enabledTabs.delete(tabId);
  });
});
