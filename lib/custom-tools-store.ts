import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type CustomToolMode = "on-enable" | "on-load";

export type CustomTool = {
  id: string;
  name: string;
  code: string;
  mode: CustomToolMode;
  createdAt: number;
  updatedAt: number;
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

const normalizeActiveToolIds = (activeToolIds: string[], tools: CustomTool[]) => {
  const toolIds = new Set(tools.map((tool) => tool.id));
  return dedupe(activeToolIds).filter((toolId) => toolIds.has(toolId));
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

          const mode = raw.mode === "on-load" ? "on-load" : "on-enable";
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
    const next = toStoredState(stored[CUSTOM_TOOLS_STORAGE_KEY]);
    updateState({ ...next, status: "ready", errorMessage: undefined });
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

const subscribeCustomToolsStore = (listener: () => void) => store.subscribe(listener);

export const waitForCustomToolsReady = async (): Promise<CustomToolsSnapshot> => {
  if (getState().status === "ready" || getState().status === "error") {
    return getState();
  }

  return new Promise((resolve) => {
    const unsubscribe = subscribeCustomToolsStore(() => {
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

export const setActiveCustomToolIds = async (toolIds: string[]) => {
  await ensureReady();
  const nextActiveToolIds = normalizeActiveToolIds(toolIds, getState().tools);
  const next: StoredCustomToolsState = {
    tools: getState().tools,
    activeToolIds: nextActiveToolIds,
  };
  await persistStoredState(next);
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
