import { OPEN_CUSTOM_TOOL_EDITOR_MESSAGE, RUN_CUSTOM_TOOL_MESSAGE, SET_UI_MESSAGE } from "../lib/events";

// TODO: refactor this file to leave only the exported defineBackground function
// move the rest into their own logical folders and files.

const CONTENT_SCRIPT_FILE = "content-scripts/content.js";
const CONSOLE_INTERCEPTOR_FILE = "console-interceptor.js";
const DEFAULT_ACTION_TITLE = "wilderness";
const ACTION_WARNING_BADGE_TEXT = "!";
const ACTION_WARNING_BADGE_COLOR = "#f59e0b";
const CUSTOM_TOOL_RUNTIME_KEY = "__wildernessCustomToolRuntime__";

const ENABLED_ORIGINS_KEY = "wilderness:enabled-origins";
type CustomToolRunReason = "enable" | "load" | "disable";
type CustomToolAction = "setup" | "cleanup";
type CustomToolRunMessage = {
  id: string;
  name: string;
  code?: string;
};
type RunCustomToolResponse = {
  ok: boolean;
  error?: string;
};

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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
};

const getInjectionFailureReason = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();

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

const openCustomToolsEditorTab = async () => {
  try {
    const url = new URL("custom-tools.html", browser.runtime.getURL("/")).toString();
    await browser.tabs.create({ url });
  } catch (error) {
    console.warn("[wilderness] Failed to open custom tools editor.", error);
  }
};

const isCustomToolRunReason = (value: unknown): value is CustomToolRunReason =>
  value === "enable" || value === "load" || value === "disable";

const isCustomToolAction = (value: unknown): value is CustomToolAction => value === "setup" || value === "cleanup";

const toCustomToolRunMessage = (value: unknown): CustomToolRunMessage | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string") {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    code: typeof record.code === "string" ? record.code : undefined,
  };
};

const toSourceLabel = (toolName: string) => toolName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48) || "custom_tool";
const toSafeError = (value: string | undefined, fallback: string) => value || fallback;
const buildCustomToolSetupSource = (tool: CustomToolRunMessage) => {
  const sourceLabel = `wilderness-custom-tool-${toSourceLabel(tool.name)}.js`;
  return `(() => {
  const registryKey = ${JSON.stringify(CUSTOM_TOOL_RUNTIME_KEY)};
  const toolId = ${JSON.stringify(tool.id)};
  const registry = globalThis[registryKey] || (globalThis[registryKey] = Object.create(null));
  const currentEntry = registry[toolId];
  if (currentEntry && typeof currentEntry.cleanup === "function") {
    try {
      const cleanupResult = currentEntry.cleanup();
      if (cleanupResult && typeof cleanupResult.then === "function") {
        cleanupResult.catch((error) => {
          console.warn("[wilderness] Async custom tool cleanup failed before setup.", error);
        });
      }
    } catch (error) {
      console.warn("[wilderness] Failed to cleanup custom tool before setup.", error);
    }
  }

  let definedTool;
  const defineTool = (definition) => {
    definedTool = definition;
    return definition;
  };

  const returnedTool = (() => {
${tool.code ?? ""}
//# sourceURL=${sourceLabel}
  })();

  const toolDefinition = definedTool ?? returnedTool;
  if (toolDefinition != null && (typeof toolDefinition !== "object" || Array.isArray(toolDefinition))) {
    throw new Error("Custom tools must call defineTool({ setup, cleanup }).");
  }

  if (toolDefinition && typeof toolDefinition.setup !== "function") {
    throw new Error("Custom tool definition is missing setup({ beforePageLoad }).");
  }

  const cleanup = toolDefinition && typeof toolDefinition.cleanup === "function" ? toolDefinition.cleanup.bind(toolDefinition) : undefined;
  registry[toolId] = { cleanup };

  if (toolDefinition && typeof toolDefinition.setup === "function") {
    const setupResult = toolDefinition.setup.call(toolDefinition, {
      beforePageLoad: document.readyState === "loading",
    });
    if (setupResult && typeof setupResult.then === "function") {
      setupResult.catch((error) => {
        console.warn("[wilderness] Async custom tool setup failed.", error);
      });
    }
  }
})();`;
};

const buildCustomToolCleanupSource = (tool: CustomToolRunMessage) => `(() => {
  const registryKey = ${JSON.stringify(CUSTOM_TOOL_RUNTIME_KEY)};
  const toolId = ${JSON.stringify(tool.id)};
  const registry = globalThis[registryKey] || (globalThis[registryKey] = Object.create(null));
  const currentEntry = registry[toolId];

  if (currentEntry && typeof currentEntry.cleanup === "function") {
    try {
      const cleanupResult = currentEntry.cleanup();
      if (cleanupResult && typeof cleanupResult.then === "function") {
        cleanupResult.catch((error) => {
          console.warn("[wilderness] Async custom tool cleanup failed.", error);
        });
      }
    } catch (error) {
      console.warn("[wilderness] Failed to cleanup custom tool.", error);
    }
  }

  delete registry[toolId];
})();`;

const runCustomToolViaUserScripts = async ({
  tabId,
  code,
  world,
}: {
  tabId: number;
  code: string;
  world: "MAIN" | "USER_SCRIPT";
}): Promise<RunCustomToolResponse> => {
  try {
    const results = await browser.userScripts.execute({
      target: { tabId },
      js: [{ code }],
      world,
      injectImmediately: true,
    });

    const errorResult = results.find((result) => "error" in result);
    if (errorResult && "error" in errorResult) {
      return {
        ok: false,
        error: errorResult.error ?? "Execution error.",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(getErrorMessage(error), "Execution error."),
    };
  }
};

const runCustomToolViaScripting = async ({
  tabId,
  tool,
  action,
}: {
  tabId: number;
  tool: CustomToolRunMessage;
  action: CustomToolAction;
}): Promise<RunCustomToolResponse> => {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      injectImmediately: true,
      args: [tool.id, tool.code ?? "", `wilderness-custom-tool-${toSourceLabel(tool.name)}.js`, action],
      func: async (
        toolId: string,
        toolCode: string,
        sourceLabel: string,
        currentAction: CustomToolAction
      ): Promise<RunCustomToolResponse> => {
        type ToolDefinition = {
          setup?: (context: { beforePageLoad: boolean }) => unknown;
          cleanup?: () => unknown;
        };

        const runtimeKey = "__wildernessCustomToolRuntime__";
        const registry =
          ((globalThis as Record<string, unknown>)[runtimeKey] as
            | Record<string, { cleanup?: (() => unknown) | undefined }>
            | undefined) ??
          (((globalThis as Record<string, unknown>)[runtimeKey] = Object.create(null)) as Record<
            string,
            { cleanup?: (() => unknown) | undefined }
          >);

        try {
          if (currentAction === "cleanup") {
            const currentEntry = registry[toolId];
            if (currentEntry && typeof currentEntry.cleanup === "function") {
              const cleanupResult = currentEntry.cleanup();
              if (cleanupResult instanceof Promise) {
                await cleanupResult;
              }
            }

            delete registry[toolId];
            return { ok: true };
          }

          const currentEntry = registry[toolId];
          if (currentEntry && typeof currentEntry.cleanup === "function") {
            const cleanupResult = currentEntry.cleanup();
            if (cleanupResult instanceof Promise) {
              await cleanupResult;
            }
          }

          let definedTool: ToolDefinition | undefined;
          const defineTool = (definition: ToolDefinition) => {
            definedTool = definition;
            return definition;
          };

          const runner = new Function("defineTool", `"use strict";\n${toolCode}\n//# sourceURL=${sourceLabel}`) as (
            registerTool: (definition: ToolDefinition) => ToolDefinition
          ) => unknown;

          const returnedTool = runner(defineTool);
          const toolDefinition = definedTool ?? (returnedTool as ToolDefinition | undefined);
          if (toolDefinition != null && (typeof toolDefinition !== "object" || Array.isArray(toolDefinition))) {
            return { ok: false, error: "Custom tools must call defineTool({ setup, cleanup })." };
          }

          if (toolDefinition && typeof toolDefinition.setup !== "function") {
            return { ok: false, error: "Custom tool definition is missing setup({ beforePageLoad })." };
          }

          registry[toolId] = {
            cleanup: typeof toolDefinition?.cleanup === "function" ? toolDefinition.cleanup.bind(toolDefinition) : undefined,
          };

          if (typeof toolDefinition?.setup === "function") {
            const setupResult = toolDefinition.setup.call(toolDefinition, {
              beforePageLoad: document.readyState === "loading",
            });
            if (setupResult instanceof Promise) {
              await setupResult;
            }
          }

          return { ok: true };
        } catch (error) {
          if (error instanceof Error) {
            return { ok: false, error: error.message };
          }

          return { ok: false, error: String(error) };
        }
      },
    });

    const first = results[0]?.result;
    if (!first?.ok) {
      return {
        ok: false,
        error: first?.error ?? "Custom tool failed in MAIN world.",
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeError(getErrorMessage(error), "Unable to execute custom tool in this browser."),
    };
  }
};

const runCustomToolForTab = async ({
  tabId,
  tool,
  reason,
  action,
}: {
  tabId: number;
  tool: CustomToolRunMessage;
  reason: CustomToolRunReason;
  action: CustomToolAction;
}): Promise<RunCustomToolResponse> => {
  if (action === "setup" && typeof tool.code !== "string") {
    return { ok: false, error: "Missing custom tool setup code." };
  }

  const executableCode = action === "setup" ? buildCustomToolSetupSource(tool) : buildCustomToolCleanupSource(tool);
  const hasUserScriptsApi =
    typeof (browser as unknown as { userScripts?: { execute?: unknown } }).userScripts?.execute === "function";

  if (hasUserScriptsApi) {
    const mainResult = await runCustomToolViaUserScripts({
      tabId,
      code: executableCode,
      world: "MAIN",
    });
    if (mainResult.ok) {
      return mainResult;
    }

    const userScriptResult = await runCustomToolViaUserScripts({
      tabId,
      code: executableCode,
      world: "USER_SCRIPT",
    });
    if (userScriptResult.ok) {
      return userScriptResult;
    }

    // Final fallback for browsers/contexts where userScripts world execution fails.
    const scriptingResult = await runCustomToolViaScripting({ tabId, tool, action });
    if (scriptingResult.ok) {
      return scriptingResult;
    }

    const combinedError = [
      mainResult.error ? `MAIN: ${mainResult.error}` : "",
      userScriptResult.error ? `USER_SCRIPT: ${userScriptResult.error}` : "",
      scriptingResult.error ? `SCRIPTING: ${scriptingResult.error}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const mainMessage = combinedError || "Unknown execution failure.";
    console.warn(`[wilderness] Custom tool "${tool.name}" failed (${reason}).`, mainMessage);
    return { ok: false, error: mainMessage };
  }

  const fallbackResult = await runCustomToolViaScripting({ tabId, tool, action });
  if (fallbackResult.ok) {
    return fallbackResult;
  }

  const fallbackMessage = fallbackResult.error || "Unknown execution failure.";
  console.warn(`[wilderness] Custom tool "${tool.name}" failed (${reason}).`, fallbackMessage);
  return { ok: false, error: fallbackMessage };
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

    if (message?.type !== RUN_CUSTOM_TOOL_MESSAGE) {
      return;
    }

    const tool = toCustomToolRunMessage(message.tool);
    const reason = message.reason;
    const action = message.action;

    if (!tool || !isCustomToolRunReason(reason) || !isCustomToolAction(action)) {
      console.warn("[wilderness] Invalid custom tool run request.");
      sendResponse({ ok: false, error: "Invalid custom tool run request." } satisfies RunCustomToolResponse);
      return;
    }

    const tabId = sender.tab?.id;
    if (!tabId) {
      console.warn(`[wilderness] Missing tab id for custom tool "${tool.name}".`);
      sendResponse({ ok: false, error: "Missing tab id for custom tool execution." } satisfies RunCustomToolResponse);
      return;
    }

    void runCustomToolForTab({ tabId, tool, reason, action }).then((response) => {
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
