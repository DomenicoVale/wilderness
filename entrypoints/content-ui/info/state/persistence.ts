import type { PanelLayoutRecord, PersistedInspectState } from "../core/types";

export const PANEL_VIEWPORT_GAP = 16;
export const MIN_LEFT_PANEL_WIDTH = 320;
export const MIN_LEFT_PANEL_HEIGHT = 320;
export const MIN_RIGHT_PANEL_WIDTH = 320;
export const MIN_RIGHT_PANEL_HEIGHT = 320;
export const DEFAULT_LEFT_PANEL_WIDTH = 416;
export const DEFAULT_RIGHT_PANEL_WIDTH = 320;
export const MAX_LEFT_PANEL_WIDTH = 1400;
export const MAX_RIGHT_PANEL_WIDTH = 1400;
export const DEFAULT_PANEL_HEIGHT_RATIO = 0.6;

const INSPECT_LAYOUT_STORAGE_KEY = "wilderness:inspect-layout";
const INSPECT_LAYOUT_VERSION = 2;
const INSPECT_STATE_STORAGE_KEY = "wilderness:inspect-state";
export const INSPECT_STATE_VERSION = 2;

let panelLayoutCache: PanelLayoutRecord = {};
let panelLayoutHydrated = false;
let panelLayoutHydratePromise: Promise<void> | null = null;
let panelLayoutPersistTimeout: number | null = null;

export const loadPanelLayoutState = (): PanelLayoutRecord => {
  return panelLayoutCache;
};

export const savePanelLayoutState = (next: PanelLayoutRecord) => {
  panelLayoutCache = {
    left: next.left,
    right: next.right,
  };

  if (panelLayoutPersistTimeout !== null) {
    window.clearTimeout(panelLayoutPersistTimeout);
  }
  panelLayoutPersistTimeout = window.setTimeout(async () => {
    panelLayoutPersistTimeout = null;
    try {
      await browser.storage.local.set({
        [INSPECT_LAYOUT_STORAGE_KEY]: {
          version: INSPECT_LAYOUT_VERSION,
          layout: panelLayoutCache,
        } satisfies { version: number; layout: PanelLayoutRecord },
      });
    } catch (error) {
      console.warn("[Inspect] Unable to persist panel layout.", error);
    }
  }, 120);
};

export const hydratePanelLayoutState = async () => {
  if (panelLayoutHydrated) {
    return;
  }
  if (panelLayoutHydratePromise) {
    await panelLayoutHydratePromise;
    return;
  }

  panelLayoutHydratePromise = (async () => {
    try {
      const stored = await browser.storage.local.get(INSPECT_LAYOUT_STORAGE_KEY);
      const raw = stored[INSPECT_LAYOUT_STORAGE_KEY] as { version?: number; layout?: PanelLayoutRecord } | undefined;
      if (!raw || raw.version !== INSPECT_LAYOUT_VERSION || !raw.layout || typeof raw.layout !== "object") {
        panelLayoutCache = {};
      } else {
        panelLayoutCache = {
          left: raw.layout.left,
          right: raw.layout.right,
        };
      }
    } catch (error) {
      console.warn("[Inspect] Unable to read saved panel layout.", error);
      panelLayoutCache = {};
    } finally {
      panelLayoutHydrated = true;
      panelLayoutHydratePromise = null;
    }
  })();

  await panelLayoutHydratePromise;
};

export const clearPersistedPanelLayoutState = async () => {
  panelLayoutCache = {};
  if (panelLayoutPersistTimeout !== null) {
    window.clearTimeout(panelLayoutPersistTimeout);
    panelLayoutPersistTimeout = null;
  }
  try {
    await browser.storage.local.remove(INSPECT_LAYOUT_STORAGE_KEY);
  } catch (error) {
    console.warn("[Inspect] Unable to clear persisted panel layout.", error);
  }
};

export const loadPersistedInspectState = async (): Promise<PersistedInspectState> => {
  try {
    const stored = await browser.storage.local.get(INSPECT_STATE_STORAGE_KEY);
    const raw = stored[INSPECT_STATE_STORAGE_KEY] as PersistedInspectState | undefined;
    if (!raw || typeof raw !== "object" || raw.version !== INSPECT_STATE_VERSION || !Array.isArray(raw.elements)) {
      return { version: INSPECT_STATE_VERSION, elements: [] };
    }
    const elements = raw.elements
      .filter((item) => item && typeof item.selector === "string" && item.styles && typeof item.styles === "object")
      .map((item) => ({
        selector: item.selector,
        styles: Object.fromEntries(
          Object.entries(item.styles).filter(([key, value]) => typeof key === "string" && typeof value === "string")
        ),
        textContent: typeof item.textContent === "string" ? item.textContent : undefined,
        originalTextContent: typeof item.originalTextContent === "string" ? item.originalTextContent : undefined,
      }));
    return {
      version: INSPECT_STATE_VERSION,
      elements,
    };
  } catch (error) {
    console.warn("[Inspect] Unable to load persisted inspect state.", error);
    return { version: INSPECT_STATE_VERSION, elements: [] };
  }
};

export const savePersistedInspectState = async (next: PersistedInspectState) => {
  try {
    await browser.storage.local.set({
      [INSPECT_STATE_STORAGE_KEY]: {
        version: INSPECT_STATE_VERSION,
        elements: next.elements,
      } satisfies PersistedInspectState,
    });
  } catch (error) {
    console.warn("[Inspect] Unable to persist inspect state.", error);
  }
};

export const clearPersistedInspectState = async () => {
  try {
    await browser.storage.local.remove(INSPECT_STATE_STORAGE_KEY);
  } catch (error) {
    console.warn("[Inspect] Unable to clear inspect state.", error);
  }
};

const TREE_EXPANSION_STORAGE_KEY = "wilderness:tree-expansion";
let treeExpansionPersistTimeout: ReturnType<typeof setTimeout> | null = null;

export const loadTreeExpansionState = (): Map<string, boolean> => {
  try {
    const raw = sessionStorage.getItem(TREE_EXPANSION_STORAGE_KEY);
    if (!raw) {
      return new Map();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Map();
    }
    return new Map(
      Object.entries(parsed as Record<string, unknown>).filter(([, value]) => typeof value === "boolean") as [string, boolean][]
    );
  } catch {
    return new Map();
  }
};

export const scheduleTreeExpansionPersist = (state: Map<string, boolean>) => {
  if (treeExpansionPersistTimeout !== null) {
    clearTimeout(treeExpansionPersistTimeout);
  }
  treeExpansionPersistTimeout = setTimeout(() => {
    treeExpansionPersistTimeout = null;
    try {
      const obj: Record<string, boolean> = {};
      state.forEach((value, key) => {
        obj[key] = value;
      });
      sessionStorage.setItem(TREE_EXPANSION_STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // sessionStorage may be unavailable in restricted contexts
    }
  }, 80);
};
