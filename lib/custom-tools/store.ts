import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type CustomToolMode = "on-enable" | "on-extension-load";

export type CustomTool = {
  id: string;
  name: string;
  code: string;
  mode: CustomToolMode;
  createdAt: number;
  updatedAt: number;
};

export type CustomToolSetupContext = {
  beforePageLoad: boolean;
};

type StoredCustomToolsState = {
  tools: CustomTool[];
  activeToolIds: string[];
};

type CustomToolsSnapshot = StoredCustomToolsState & {
  status: "idle" | "loading" | "ready" | "error";
  errorMessage?: string;
};

const CUSTOM_TOOLS_STORAGE_KEY = "wilderness:custom-tools";
const DEFAULT_CENTER_GUIDES_TOOL_ID = "wilderness-example-center-guides";
const LEGACY_ON_LOAD_MODE = "on-load";
const DEFAULT_CENTER_GUIDES_TOOL_CODE = `const ROOT_ID = "wilderness-center-guides-root";
const VERTICAL_ID = "wilderness-center-guides-vertical";
const HORIZONTAL_ID = "wilderness-center-guides-horizontal";

let root = null;
let update = null;

defineTool({
  setup({ beforePageLoad }) {
    // Available when a tool needs different early-vs-late setup behavior.
    void beforePageLoad;
    this.cleanup();

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.style.position = "fixed";
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "100vw";
    root.style.height = "100vh";
    root.style.pointerEvents = "none";
    root.style.zIndex = "2147483645";

    const vertical = document.createElement("div");
    vertical.id = VERTICAL_ID;
    vertical.style.position = "absolute";
    vertical.style.left = "50%";
    vertical.style.top = "0";
    vertical.style.width = "3px";
    vertical.style.transform = "translateX(-50%)";
    vertical.style.background = "rgba(0, 255, 136, 0.5)";

    const horizontal = document.createElement("div");
    horizontal.id = HORIZONTAL_ID;
    horizontal.style.position = "absolute";
    horizontal.style.left = "0";
    horizontal.style.top = "50%";
    horizontal.style.height = "3px";
    horizontal.style.transform = "translateY(-50%)";
    horizontal.style.background = "rgba(0, 255, 136, 0.5)";

    update = () => {
      vertical.style.height = \`\${window.innerHeight}px\`;
      horizontal.style.width = \`\${window.innerWidth}px\`;
    };

    root.append(vertical, horizontal);
    (document.body ?? document.documentElement)?.append(root);
    update();
    window.addEventListener("resize", update, { passive: true });
  },

  cleanup() {
    if (typeof update === "function") {
      window.removeEventListener("resize", update);
      update = null;
    }

    root?.remove();
    root = null;

    document.getElementById(VERTICAL_ID)?.remove();
    document.getElementById(HORIZONTAL_ID)?.remove();
    document.getElementById(ROOT_ID)?.remove();
  },
});`;

let initialized = false;
const initialState: CustomToolsSnapshot = {
  status: "idle",
  tools: [],
  activeToolIds: [],
};

const store = createStore<CustomToolsSnapshot>(() => initialState);

const updateState = (next: Partial<CustomToolsSnapshot>) => {
  store.setState({ ...store.getState(), ...next });
};

const getState = () => store.getState();

const dedupe = (values: string[]) => Array.from(new Set(values));
const isExtensionLoadMode = (mode: CustomToolMode) => mode === "on-extension-load";

const createDefaultCenterGuidesTool = (): CustomTool => {
  const now = Date.now();
  return {
    id: DEFAULT_CENTER_GUIDES_TOOL_ID,
    name: "Center guides",
    code: DEFAULT_CENTER_GUIDES_TOOL_CODE,
    mode: "on-enable",
    createdAt: now,
    updatedAt: now,
  };
};

const mergeDefaultCenterGuidesTool = (tools: CustomTool[]) => {
  const index = tools.findIndex((tool) => tool.id === DEFAULT_CENTER_GUIDES_TOOL_ID);
  const now = Date.now();
  if (index < 0) {
    return [...tools, createDefaultCenterGuidesTool()];
  }

  const current = tools[index];
  const needsRefresh =
    current.name !== "Center guides" || current.mode !== "on-enable" || current.code !== DEFAULT_CENTER_GUIDES_TOOL_CODE;
  if (!needsRefresh) {
    return tools;
  }

  const nextTool: CustomTool = {
    ...current,
    name: "Center guides",
    mode: "on-enable",
    code: DEFAULT_CENTER_GUIDES_TOOL_CODE,
    updatedAt: now,
  };
  const nextTools = tools.slice();
  nextTools[index] = nextTool;
  return nextTools;
};

const normalizeActiveToolIds = (activeToolIds: string[], tools: CustomTool[]) => {
  const toolIds = new Set(tools.map((tool) => tool.id));
  return dedupe(activeToolIds).filter((toolId) => toolIds.has(toolId));
};

const getExtensionLoadActiveToolIds = (activeToolIds: string[], tools: CustomTool[]) => {
  const toolsById = new Map(tools.map((tool) => [tool.id, tool]));
  return normalizeActiveToolIds(activeToolIds, tools).filter((toolId) =>
    isExtensionLoadMode(toolsById.get(toolId)?.mode ?? "on-enable")
  );
};

const toStoredState = (value: unknown): StoredCustomToolsState => {
  if (!value || typeof value !== "object") {
    return { tools: [], activeToolIds: [] };
  }

  const record = value as Record<string, unknown>;
  const tools = Array.isArray(record.tools)
    ? record.tools
        .map((tool) => {
          if (!tool || typeof tool !== "object") {
            return null;
          }

          const raw = tool as Record<string, unknown>;
          if (typeof raw.id !== "string" || typeof raw.name !== "string" || typeof raw.code !== "string") {
            return null;
          }

          const mode = raw.mode === "on-extension-load" || raw.mode === LEGACY_ON_LOAD_MODE ? "on-extension-load" : "on-enable";
          return {
            id: raw.id,
            name: raw.name,
            code: raw.code,
            mode,
            createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
            updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
          } satisfies CustomTool;
        })
        .filter((tool): tool is CustomTool => Boolean(tool))
    : [];

  const activeToolIds = Array.isArray(record.activeToolIds)
    ? record.activeToolIds.filter((item): item is string => typeof item === "string")
    : typeof record.activeToolId === "string"
      ? [record.activeToolId]
      : [];

  return {
    tools,
    activeToolIds: normalizeActiveToolIds(activeToolIds, tools),
  };
};

const persistStoredState = async (next: StoredCustomToolsState) => {
  updateState({ ...next, status: "ready", errorMessage: undefined });
  try {
    await browser.storage.local.set({
      [CUSTOM_TOOLS_STORAGE_KEY]: next,
    });
  } catch (error) {
    console.warn("[wilderness] Failed to save custom tools state.", error);
    updateState({ status: "error", errorMessage: "Failed to save custom tools state." });
  }
};

const hydrateCustomToolsStore = async () => {
  updateState({ status: "loading" });
  try {
    const stored = await browser.storage.local.get(CUSTOM_TOOLS_STORAGE_KEY);
    const hasStoredState = Object.hasOwn(stored, CUSTOM_TOOLS_STORAGE_KEY);
    if (!hasStoredState) {
      const seeded: StoredCustomToolsState = {
        tools: [createDefaultCenterGuidesTool()],
        activeToolIds: [],
      };
      updateState({ ...seeded, status: "ready", errorMessage: undefined });
      await browser.storage.local.set({
        [CUSTOM_TOOLS_STORAGE_KEY]: seeded,
      });
      return;
    }
    const parsed = toStoredState(stored[CUSTOM_TOOLS_STORAGE_KEY]);
    const mergedTools = mergeDefaultCenterGuidesTool(parsed.tools);
    const next: StoredCustomToolsState = {
      tools: mergedTools,
      activeToolIds: getExtensionLoadActiveToolIds(parsed.activeToolIds, mergedTools),
    };
    updateState({ ...next, status: "ready", errorMessage: undefined });
    const activeToolIdsChanged =
      next.activeToolIds.length !== parsed.activeToolIds.length ||
      next.activeToolIds.some((toolId, index) => parsed.activeToolIds[index] !== toolId);
    if (mergedTools !== parsed.tools || activeToolIdsChanged) {
      await browser.storage.local.set({
        [CUSTOM_TOOLS_STORAGE_KEY]: next,
      });
    }
  } catch (error) {
    console.warn("[wilderness] Failed to load custom tools state.", error);
    updateState({ status: "error", errorMessage: "Failed to load custom tools state." });
  }
};

const ensureReady = async () => {
  ensureCustomToolsStore();
  const snapshot = await waitForCustomToolsReady();
  if (snapshot.status === "error") {
    console.warn("[wilderness] Custom tools store is unavailable.", snapshot.errorMessage);
  }
};

const createToolId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `custom-tool-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const ensureCustomToolsStore = () => {
  if (initialized) {
    return;
  }

  initialized = true;
  void hydrateCustomToolsStore();

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    const change = changes[CUSTOM_TOOLS_STORAGE_KEY];
    if (!change) {
      return;
    }

    const next = toStoredState(change.newValue);
    updateState({ ...next, status: "ready", errorMessage: undefined });
  });
};

export const useCustomToolsStore = <T>(selector: (state: CustomToolsSnapshot) => T) => useStore(store, selector);

export const getCustomToolsSnapshot = () => getState();

export const subscribeCustomToolsSnapshot = (listener: () => void) => store.subscribe(listener);

export const waitForCustomToolsReady = async (): Promise<CustomToolsSnapshot> => {
  if (getState().status === "ready" || getState().status === "error") {
    return getState();
  }

  return new Promise((resolve) => {
    const unsubscribe = subscribeCustomToolsSnapshot(() => {
      if (getState().status !== "ready" && getState().status !== "error") {
        return;
      }

      unsubscribe();
      resolve(getState());
    });
  });
};

export const addCustomTool = async ({ name, code, mode }: { name: string; code: string; mode: CustomToolMode }) => {
  await ensureReady();
  const now = Date.now();
  const tool: CustomTool = {
    id: createToolId(),
    name: name.trim(),
    code,
    mode,
    createdAt: now,
    updatedAt: now,
  };

  const next = {
    tools: [...getState().tools, tool],
    activeToolIds: getState().activeToolIds,
  };

  await persistStoredState(next);
  return tool;
};

export const updateCustomTool = async ({
  id,
  name,
  code,
  mode,
}: {
  id: string;
  name: string;
  code: string;
  mode: CustomToolMode;
}) => {
  await ensureReady();
  const existingTool = getState().tools.find((tool) => tool.id === id);
  if (!existingTool) {
    console.warn("[wilderness] Unable to update unknown custom tool.", id);
    return null;
  }

  const updatedTool: CustomTool = {
    ...existingTool,
    name: name.trim(),
    code,
    mode,
    updatedAt: Date.now(),
  };

  const next: StoredCustomToolsState = {
    tools: getState().tools.map((tool) => (tool.id === id ? updatedTool : tool)),
    activeToolIds: getState().activeToolIds,
  };

  await persistStoredState(next);
  return updatedTool;
};

export const setActiveCustomToolIds = async (toolIds: string[]) => {
  await ensureReady();
  const nextActiveToolIds = normalizeActiveToolIds(toolIds, getState().tools);
  const next: StoredCustomToolsState = {
    tools: getState().tools,
    activeToolIds: nextActiveToolIds,
  };
  await persistStoredState(next);
};

export const clearOnEnableActiveCustomToolIds = async () => {
  await ensureReady();
  const tools = getState().tools;
  const nextActiveToolIds = getExtensionLoadActiveToolIds(getState().activeToolIds, tools);
  if (nextActiveToolIds.length === getState().activeToolIds.length) {
    return false;
  }

  await persistStoredState({
    tools,
    activeToolIds: nextActiveToolIds,
  });
  return true;
};

export const toggleActiveCustomToolId = async (toolId: string, forceEnabled?: boolean) => {
  await ensureReady();
  const tools = getState().tools;
  if (!tools.some((tool) => tool.id === toolId)) {
    console.warn("[wilderness] Unable to toggle unknown custom tool.", toolId);
    return false;
  }

  const activeSet = new Set(getState().activeToolIds);
  const isActive = activeSet.has(toolId);
  const shouldEnable = typeof forceEnabled === "boolean" ? forceEnabled : !isActive;

  if (shouldEnable) {
    activeSet.add(toolId);
  } else {
    activeSet.delete(toolId);
  }

  await setActiveCustomToolIds(Array.from(activeSet));
  return shouldEnable;
};

export const getActiveCustomTools = () => {
  const toolsById = new Map(getState().tools.map((tool) => [tool.id, tool]));
  return getState()
    .activeToolIds.map((toolId) => toolsById.get(toolId))
    .filter((tool): tool is CustomTool => Boolean(tool));
};
