import type { IconNode } from "lucide";
import type { DeepTarget } from "../../../../lib/deep-pick";

export type SelectOption = {
  label: string;
  value: string;
};

export type SegmentedOption = {
  icon: IconNode;
  value: string;
  title: string;
};

export type TransformMode = "move" | "scale" | "rotate" | "skew";
export type TransformAxis = "x" | "y" | "z";

export type TransformState = {
  move: Record<TransformAxis, { value: number; unit: "px" | "%" }>;
  scale: Record<TransformAxis, { value: number; unit: "" }>;
  rotate: Record<TransformAxis, { value: number; unit: "deg" }>;
  skew: Record<TransformAxis, { value: number; unit: "deg" }>;
};

export type WebFontGlobal = Window & {
  WebFont?: {
    load: (payload: { google: { families: string[] } }) => void;
  };
};

export type ApplyStyleOptions = {
  rerender?: boolean;
};

export type StyleWritableElement = HTMLElement | SVGElement;

export type ScopedCssVariable = {
  name: string;
  value: string;
  previewColor: string | null;
};

export type InfoSettings = {
  showActualLayoutDistances: boolean;
};

export type InspectElementState = {
  selector: string;
  styles: Record<string, string>;
  textContent?: string;
  originalTextContent?: string;
};

export type PendingInspectState = {
  dirty: boolean;
  elements: InspectElementState[];
};

export type PersistedInspectState = {
  version: number;
  elements: InspectElementState[];
};

export type PanelLayoutRecord = {
  right?: { left: number; top: number; width: number; height: number; collapsed: boolean };
  left?: { left: number; top: number; width: number; height: number; collapsed: boolean };
};

export type MediaItem = {
  element: Element;
  kind: "image" | "picture" | "video" | "audio" | "source" | "iframe" | "embed" | "object" | "svg" | "canvas" | "background";
  url: string;
  mimeType: string;
  intrinsic: { width: number; height: number } | null;
  rendered: { width: number; height: number };
  selector: string;
};

export type MediaMatchContext = {
  element: Element;
  items: MediaItem[];
  relation: "selected" | "ancestor" | "nearby";
};

export type SelectionTarget = DeepTarget | Element;

export type PanelHandle = {
  root: HTMLDivElement;
  remove: () => void;
  destroy: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setVisible: (visible: boolean) => void;
  render: (target: Element | null, options?: { preserveScroll?: boolean }) => void;
  setDirtyState: (dirty: boolean) => void;
  getPendingState: () => PendingInspectState;
  loadPendingState: (next: PendingInspectState, options?: { applyToDocument?: boolean }) => void;
  clearPendingState: (options?: { resetAppliedStyles?: boolean }) => void;
  recordTextChange: (target: Element | null, textContent: string, originalTextContent: string) => void;
  setSelectionCallback: (callback: ((element: Element) => void) | null) => void;
  setPreviewHoverCallback: (callback: ((element: Element | null) => void) | null) => void;
  setRestoreStateCallback: (callback: (() => Promise<boolean>) | null) => void;
  setStatusFeedback: (message: string, tone?: "success" | "error") => void;
};
