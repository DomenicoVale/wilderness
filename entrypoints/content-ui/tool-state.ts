export type ToolState = {
  guidesEnabled: boolean;
  infoEnabled: boolean;
  consolePanelOpen: boolean;
};

type Listener = () => void;

let state: ToolState = {
  guidesEnabled: false,
  infoEnabled: false,
  consolePanelOpen: false,
};

const listeners = new Set<Listener>();

export const getToolState = () => state;

export const setToolState = (next: Partial<ToolState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export const subscribeToolState = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
