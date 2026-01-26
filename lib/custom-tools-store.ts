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
  activeToolId: string | null;
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
  activeToolId: null,
};

const store = createStore<CustomToolsSnapshot>(() => initialState);

const updateState = (next: Partial<CustomToolsSnapshot>) => {
  store.setState({ ...store.getState(), ...next });
};

const getState = () => store.getState();

const toStoredState = (value: unknown): StoredCustomToolsState => {
  if (!value || typeof value !== "object") {
    return { tools: [], activeToolId: null };
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

  const activeToolId = typeof record.activeToolId === "string" ? record.activeToolId : null;
  return { tools, activeToolId };
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
    activeToolId: getState().activeToolId,
  };

  await persistStoredState(next);
  return tool;
};

export const setActiveCustomToolId = async (toolId: string | null) => {
  await ensureReady();
  const next: StoredCustomToolsState = {
    tools: getState().tools,
    activeToolId: toolId,
  };
  await persistStoredState(next);
};

export const getActiveCustomTool = () => {
  if (!getState().activeToolId) {
    return null;
  }

  return getState().tools.find((tool) => tool.id === getState().activeToolId) ?? null;
};
