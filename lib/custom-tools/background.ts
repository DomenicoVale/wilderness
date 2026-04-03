import type { CustomToolBridgeResponse } from "./bridge";
import { checkUserScriptsAvailability, hasCustomToolPermission } from "./permissions";

const CUSTOM_TOOL_BRIDGE_SCRIPT_ID = "wilderness-custom-tool-bridge";
const CUSTOM_TOOL_BRIDGE_SCRIPT_FILE = "custom-tool-user-script.js";
const CUSTOM_TOOL_BRIDGE_WORLD_CSP = "script-src 'self' 'unsafe-eval'; object-src 'self'";

let customToolBridgeRegistrationPromise: Promise<CustomToolBridgeResponse> | null = null;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
};

const getUserScriptsApiAvailability = async (): Promise<CustomToolBridgeResponse> => {
  return await checkUserScriptsAvailability();
};

export const ensureCustomToolBridgeRegistered = async (): Promise<CustomToolBridgeResponse> => {
  if (customToolBridgeRegistrationPromise) {
    return customToolBridgeRegistrationPromise;
  }

  customToolBridgeRegistrationPromise = (async () => {
    const availability = await getUserScriptsApiAvailability();
    if (!availability.ok) {
      return availability;
    }

    try {
      await browser.userScripts.configureWorld({
        csp: CUSTOM_TOOL_BRIDGE_WORLD_CSP,
      });
    } catch (error) {
      return {
        ok: false,
        error: getErrorMessage(error) || "Failed to configure the custom tool user-script world.",
      };
    }

    try {
      await browser.userScripts.unregister({ ids: [CUSTOM_TOOL_BRIDGE_SCRIPT_ID] }).catch((error) => {
        console.warn("[wilderness] Failed to unregister custom tool bridge.", error);
      });

      await browser.userScripts.register([
        {
          id: CUSTOM_TOOL_BRIDGE_SCRIPT_ID,
          matches: ["<all_urls>"],
          js: [{ file: CUSTOM_TOOL_BRIDGE_SCRIPT_FILE }],
          runAt: "document_start",
          world: browser.userScripts.ExecutionWorld.USER_SCRIPT,
        },
      ]);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: getErrorMessage(error) || "Failed to register the custom tool bridge.",
      };
    }
  })().finally(() => {
    customToolBridgeRegistrationPromise = null;
  });

  return customToolBridgeRegistrationPromise;
};

export const injectCustomToolBridgeForTab = async (tabId: number): Promise<CustomToolBridgeResponse> => {
  const registration = await ensureCustomToolBridgeRegistered();
  if (!registration.ok) {
    return registration;
  }

  const executeUserScript = (browser.userScripts as { execute?: typeof browser.userScripts.execute }).execute;
  if (typeof executeUserScript !== "function") {
    return { ok: true };
  }

  try {
    const results = await executeUserScript({
      target: { tabId },
      js: [{ file: CUSTOM_TOOL_BRIDGE_SCRIPT_FILE }],
      world: browser.userScripts.ExecutionWorld.USER_SCRIPT,
      injectImmediately: true,
    });

    const errorResult = results.find((result) => "error" in result);
    if (errorResult && "error" in errorResult) {
      return {
        ok: false,
        error: errorResult.error ?? "Custom tool bridge injection failed.",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error) || "Custom tool bridge injection failed.",
    };
  }
};

export const initializeCustomToolBridge = async () => {
  const hasPermission = await hasCustomToolPermission();
  if (!hasPermission) {
    return;
  }

  const registration = await ensureCustomToolBridgeRegistered();
  if (!registration.ok) {
    console.warn("[wilderness] Custom tool bridge unavailable.", registration.error ?? "Unknown bridge registration failure.");
  }
};

export const openCustomToolsEditorTab = async () => {
  try {
    const url = new URL("custom-tools.html", browser.runtime.getURL("/")).toString();
    await browser.tabs.create({ url });
  } catch (error) {
    console.warn("[wilderness] Failed to open custom tools editor.", error);
  }
};
