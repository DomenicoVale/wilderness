import { formatHex, parse } from "culori";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Columns2,
  Columns3,
  createElement,
  FlipHorizontal2,
  FlipVertical2,
  type IconNode,
  Rows2,
  Rows3,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Trash2,
} from "lucide";
import {
  type DeepTarget,
  getDeepTargetFromPoint,
  getElementForTarget,
  getTargetRect,
  isDeepPickEvent,
} from "../../../lib/deep-pick";
import { ensureInfoStyles, removeInfoStyles } from "./info-styles";
import { buildSelectorForElement, getComputedStyleEntries, isInfoUiElement, isOffBounds, observeRemoval } from "./info-utils";
import { createLayoutOverlay, type LayoutOverlayHandle } from "./layout-overlay.element";

const MOUSE_BLOCK_EVENTS: Array<keyof WindowEventMap> = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseover",
  "mouseout",
  "mouseenter",
  "mouseleave",
  "contextmenu",
];

const FONT_CATALOG = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Nunito",
  "Merriweather",
  "Playfair Display",
  "Source Sans 3",
  "Oswald",
  "Raleway",
  "IBM Plex Sans",
  "Work Sans",
  "DM Sans",
  "Manrope",
];

type SelectOption = {
  label: string;
  value: string;
};

type SegmentedOption = {
  icon: IconNode;
  value: string;
  title: string;
};

type TransformMode = "move" | "scale" | "rotate" | "skew";
type TransformAxis = "x" | "y" | "z";
type TransformState = {
  move: Record<TransformAxis, { value: number; unit: "px" | "%" }>;
  scale: Record<TransformAxis, { value: number; unit: "" }>;
  rotate: Record<TransformAxis, { value: number; unit: "deg" }>;
  skew: Record<TransformAxis, { value: number; unit: "deg" }>;
};

const DISPLAY_OPTIONS: SelectOption[] = [
  { label: "block", value: "block" },
  { label: "inline-block", value: "inline-block" },
  { label: "flex", value: "flex" },
  { label: "grid", value: "grid" },
  { label: "inline-flex", value: "inline-flex" },
  { label: "inline-grid", value: "inline-grid" },
];

const POSITION_OPTIONS: SelectOption[] = [
  { label: "static", value: "static" },
  { label: "relative", value: "relative" },
  { label: "absolute", value: "absolute" },
  { label: "fixed", value: "fixed" },
  { label: "sticky", value: "sticky" },
];

const FLEX_DIRECTION_OPTIONS: SegmentedOption[] = [
  { icon: ArrowRight, value: "row", title: "row" },
  { icon: ArrowDown, value: "column", title: "column" },
  { icon: ArrowLeft, value: "row-reverse", title: "row-reverse" },
  { icon: ArrowUp, value: "column-reverse", title: "column-reverse" },
];

const JUSTIFY_OPTIONS: SegmentedOption[] = [
  { icon: AlignStartHorizontal, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterHorizontal, value: "center", title: "center" },
  { icon: AlignEndHorizontal, value: "flex-end", title: "flex-end" },
  { icon: Columns2, value: "space-between", title: "space-between" },
  { icon: Columns3, value: "space-around", title: "space-around" },
  { icon: FlipHorizontal2, value: "space-evenly", title: "space-evenly" },
];
const JUSTIFY_OPTIONS_ROW_REVERSE: SegmentedOption[] = [
  { icon: AlignEndHorizontal, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterHorizontal, value: "center", title: "center" },
  { icon: AlignStartHorizontal, value: "flex-end", title: "flex-end" },
  { icon: Columns2, value: "space-between", title: "space-between" },
  { icon: Columns3, value: "space-around", title: "space-around" },
  { icon: FlipHorizontal2, value: "space-evenly", title: "space-evenly" },
];
const JUSTIFY_OPTIONS_COLUMN: SegmentedOption[] = [
  { icon: AlignStartVertical, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterVertical, value: "center", title: "center" },
  { icon: AlignEndVertical, value: "flex-end", title: "flex-end" },
  { icon: Rows2, value: "space-between", title: "space-between" },
  { icon: Rows3, value: "space-around", title: "space-around" },
  { icon: FlipVertical2, value: "space-evenly", title: "space-evenly" },
];
const JUSTIFY_OPTIONS_COLUMN_REVERSE: SegmentedOption[] = [
  { icon: AlignEndVertical, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterVertical, value: "center", title: "center" },
  { icon: AlignStartVertical, value: "flex-end", title: "flex-end" },
  { icon: Rows2, value: "space-between", title: "space-between" },
  { icon: Rows3, value: "space-around", title: "space-around" },
  { icon: FlipVertical2, value: "space-evenly", title: "space-evenly" },
];

const ALIGN_ITEMS_OPTIONS: SegmentedOption[] = [
  { icon: AlignStartVertical, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterVertical, value: "center", title: "center" },
  { icon: AlignEndVertical, value: "flex-end", title: "flex-end" },
  { icon: Columns2, value: "baseline", title: "baseline" },
  { icon: FlipHorizontal2, value: "stretch", title: "stretch" },
];
const ALIGN_ITEMS_OPTIONS_HORIZONTAL: SegmentedOption[] = [
  { icon: AlignStartHorizontal, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterHorizontal, value: "center", title: "center" },
  { icon: AlignEndHorizontal, value: "flex-end", title: "flex-end" },
  { icon: Rows2, value: "baseline", title: "baseline" },
  { icon: FlipVertical2, value: "stretch", title: "stretch" },
];
const GRID_MAIN_AXIS_HORIZONTAL_OPTIONS: SegmentedOption[] = [
  { icon: AlignStartHorizontal, value: "start", title: "start" },
  { icon: AlignCenterHorizontal, value: "center", title: "center" },
  { icon: AlignEndHorizontal, value: "end", title: "end" },
  { icon: FlipHorizontal2, value: "stretch", title: "stretch" },
];
const GRID_MAIN_AXIS_VERTICAL_OPTIONS: SegmentedOption[] = [
  { icon: AlignStartVertical, value: "start", title: "start" },
  { icon: AlignCenterVertical, value: "center", title: "center" },
  { icon: AlignEndVertical, value: "end", title: "end" },
  { icon: FlipVertical2, value: "stretch", title: "stretch" },
];

const WRAP_OPTIONS: SegmentedOption[] = [
  { icon: Rows2, value: "nowrap", title: "nowrap" },
  { icon: Rows3, value: "wrap", title: "wrap" },
  { icon: Columns2, value: "wrap-reverse", title: "wrap-reverse" },
];

const TEXT_ALIGN_OPTIONS: SegmentedOption[] = [
  { icon: TextAlignStart, value: "left", title: "left" },
  { icon: TextAlignCenter, value: "center", title: "center" },
  { icon: TextAlignEnd, value: "right", title: "right" },
  { icon: TextAlignJustify, value: "justify", title: "justify" },
];

type WebFontGlobal = Window & {
  WebFont?: {
    load: (payload: { google: { families: string[] } }) => void;
  };
};

type ApplyStyleOptions = {
  rerender?: boolean;
};

type StyleWritableElement = HTMLElement | SVGElement;

const UNIT_LESS_NUMERIC_PROPERTIES = new Set([
  "line-height",
  "font-weight",
  "z-index",
  "opacity",
  "flex-grow",
  "flex-shrink",
  "order",
]);
const COMMON_CSS_UNITS = new Set(["px", "%", "em", "rem", "vw", "vh", "deg", "s", "ms"]);
const AUTO_SELECT_INPUT_TYPES = new Set(["", "text", "search", "url", "tel", "password", "email"]);
const MAIN_SECTION_PROPERTIES = new Set([
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "transform",
  "flex-direction",
  "justify-content",
  "align-items",
  "flex-wrap",
  "gap",
  "row-gap",
  "column-gap",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "color",
  "background-color",
  "border-color",
  "border-width",
  "border-style",
  "border-radius",
  "box-shadow",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-align",
]);
const INLINE_STYLE_PRIORITY = "important";

export type InfoSettings = {
  showActualLayoutDistances: boolean;
};

type PanelHandle = {
  root: HTMLDivElement;
  remove: () => void;
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

type MediaItem = {
  element: Element;
  kind: "image" | "picture" | "video" | "audio" | "source" | "iframe" | "embed" | "object" | "svg" | "canvas" | "background";
  url: string;
  mimeType: string;
  intrinsic: { width: number; height: number } | null;
  rendered: { width: number; height: number };
  selector: string;
};

type MediaMatchContext = {
  element: Element;
  items: MediaItem[];
  relation: "selected" | "ancestor" | "nearby";
};

type SelectionTarget = DeepTarget | Element;

const createOutline = (variant: "hover" | "pinned") => {
  const outline = document.createElement("div");
  outline.className = "wilderness-info-outline";
  outline.setAttribute("data-variant", variant);
  outline.style.display = "none";
  return outline;
};

const showOutline = (outline: HTMLDivElement, rect: DOMRect) => {
  outline.style.left = `${rect.left}px`;
  outline.style.top = `${rect.top}px`;
  outline.style.width = `${rect.width}px`;
  outline.style.height = `${rect.height}px`;
  outline.style.display = "block";
};

const hideOutline = (outline: HTMLDivElement) => {
  outline.style.display = "none";
};

const getSafeRect = (target: DeepTarget, context: string) => {
  try {
    return getTargetRect(target, "viewport");
  } catch (error) {
    console.warn(`[Inspect] Unable to read ${context} bounds.`, error);
    return null;
  }
};

const isDeepTarget = (value: SelectionTarget): value is DeepTarget =>
  Boolean(value && typeof value === "object" && "documentX" in value && "documentY" in value);

const parseNumericUnit = (raw: string) => {
  const value = raw.trim();
  const matched = value.match(/^(-?\d*\.?\d+)\s*([a-z%]*)$/i);
  if (!matched) {
    return null;
  }

  const numeric = Number.parseFloat(matched[1]);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return {
    numeric,
    unit: matched[2].toLowerCase(),
  };
};

const formatNumericValue = (value: number) => {
  const fixed = Number(value.toFixed(6));
  return String(fixed)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
};

const inferNumericUnit = (property: string, currentUnit: string) => {
  if (currentUnit) {
    return currentUnit;
  }

  if (UNIT_LESS_NUMERIC_PROPERTIES.has(property)) {
    return "";
  }

  if (property.includes("duration") || property.includes("delay")) {
    return "ms";
  }

  if (property.includes("angle") || property.includes("rotate") || property.includes("skew")) {
    return "deg";
  }

  return "px";
};

const resolveNumericStep = (unit: string) => {
  if (unit === "ms") {
    return 10;
  }
  if (unit === "s") {
    return 0.1;
  }
  return 1;
};

const isStyleWritableElement = (element: Element | null): element is StyleWritableElement =>
  element instanceof HTMLElement || element instanceof SVGElement;

const getDisplayStyleValue = (element: Element, property: string, computedValue: string) => {
  if (isStyleWritableElement(element)) {
    const inlineValue = element.style.getPropertyValue(property).trim();
    if (inlineValue) {
      return inlineValue;
    }
  }

  return computedValue;
};

const normalizeColorValue = (raw: string) => {
  const value = raw.trim();
  if (!value) {
    return "";
  }

  let candidate = value;
  if (value.toLowerCase().startsWith("0x")) {
    const hex = value.slice(2);
    if (/^[\da-f]{3}$|^[\da-f]{4}$|^[\da-f]{6}$|^[\da-f]{8}$/i.test(hex)) {
      candidate = `#${hex}`;
    }
  }

  return candidate;
};

const toPickerColor = (raw: string) => {
  const parsed = parse(normalizeColorValue(raw));
  if (!parsed) {
    return null;
  }
  return formatHex(parsed);
};

const isColorProperty = (property: string) => {
  const normalized = property.toLowerCase();
  return normalized.includes("color") || normalized === "fill" || normalized === "stroke";
};

const ensureWebFontLoader = async () => {
  const globalWindow = window as WebFontGlobal;
  if (globalWindow.WebFont) {
    return globalWindow.WebFont;
  }

  await import("webfontloader");
  if (!globalWindow.WebFont) {
    throw new Error("WebFont loader unavailable after import.");
  }
  return globalWindow.WebFont;
};

const createSegmentIcon = (iconNode: IconNode) => {
  const icon = createElement(iconNode, {
    width: 15,
    height: 15,
    stroke: "currentColor",
    "stroke-width": 2,
  });
  icon.classList.add("wilderness-inspect-segmented-icon");
  icon.setAttribute("aria-hidden", "true");
  return icon;
};

const safePickerColor = (raw: string) => toPickerColor(raw) ?? "#000000";

const getElementTreePath = (element: Element) => {
  const path: Element[] = [];
  let current: Element | null = element;
  while (current) {
    path.unshift(current);
    current = current.parentElement;
  }
  return path;
};

const SRCSET_SPLIT_PATTERN = /\s*,\s*/;
const MEDIA_EXTENSION_MIME_MAP: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  pdf: "application/pdf",
  html: "text/html",
  htm: "text/html",
};
const FALLBACK_KIND_MIME: Record<MediaItem["kind"], string> = {
  image: "image/*",
  picture: "image/*",
  video: "video/*",
  audio: "audio/*",
  source: "application/octet-stream",
  iframe: "text/html",
  embed: "application/octet-stream",
  object: "application/octet-stream",
  svg: "image/svg+xml",
  canvas: "image/png",
  background: "image/*",
};
const NON_TREE_TAGS = new Set(["SCRIPT", "STYLE", "META", "LINK", "NOSCRIPT", "TEMPLATE", "TITLE", "BASE"]);

const getFlexAxisOptions = (direction: string) => {
  if (direction === "column") {
    return {
      justify: JUSTIFY_OPTIONS_COLUMN,
      align: ALIGN_ITEMS_OPTIONS_HORIZONTAL,
    };
  }
  if (direction === "column-reverse") {
    return {
      justify: JUSTIFY_OPTIONS_COLUMN_REVERSE,
      align: ALIGN_ITEMS_OPTIONS_HORIZONTAL,
    };
  }
  return {
    justify: direction === "row-reverse" ? JUSTIFY_OPTIONS_ROW_REVERSE : JUSTIFY_OPTIONS,
    align: ALIGN_ITEMS_OPTIONS,
  };
};

const getGridAxisOptions = (computed: CSSStyleDeclaration): { justify: SegmentedOption[]; align: SegmentedOption[] } => {
  const writingMode = (computed.writingMode || "").toLowerCase();
  const inlineAxisIsVertical = writingMode.startsWith("vertical") || writingMode.startsWith("sideways");

  if (inlineAxisIsVertical) {
    return {
      justify: GRID_MAIN_AXIS_VERTICAL_OPTIONS,
      align: GRID_MAIN_AXIS_HORIZONTAL_OPTIONS,
    };
  }

  return {
    justify: GRID_MAIN_AXIS_HORIZONTAL_OPTIONS,
    align: GRID_MAIN_AXIS_VERTICAL_OPTIONS,
  };
};

const normalizeMediaUrl = (raw: string) => {
  const value = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!value) {
    return "";
  }

  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
};

const getPrimarySrcsetUrl = (srcset: string) => {
  const firstCandidate = srcset
    .split(SRCSET_SPLIT_PATTERN)
    .map((part) => part.trim())
    .find(Boolean);
  if (!firstCandidate) {
    return "";
  }

  const [urlPart] = firstCandidate.split(/\s+/);
  return urlPart ?? "";
};

const parseDataUrlMimeType = (url: string) => {
  const match = url.match(/^data:([^;,]+)[;,]/i);
  return match?.[1] ?? "";
};

const inferMediaMimeType = (kind: MediaItem["kind"], url: string, hint?: string) => {
  const hintValue = hint?.trim();
  if (hintValue) {
    return hintValue;
  }

  const normalizedUrl = normalizeMediaUrl(url);
  if (!normalizedUrl) {
    return FALLBACK_KIND_MIME[kind];
  }

  if (normalizedUrl.startsWith("data:")) {
    return parseDataUrlMimeType(normalizedUrl) || FALLBACK_KIND_MIME[kind];
  }

  try {
    const parsed = new URL(normalizedUrl, window.location.href);
    const pathname = parsed.pathname || "";
    const extension = pathname.includes(".") ? pathname.split(".").pop()?.toLowerCase() : "";
    if (extension && MEDIA_EXTENSION_MIME_MAP[extension]) {
      return MEDIA_EXTENSION_MIME_MAP[extension];
    }
  } catch {
    const extension = normalizedUrl.includes(".") ? normalizedUrl.split(".").pop()?.split(/[?#]/)[0].toLowerCase() : "";
    if (extension && MEDIA_EXTENSION_MIME_MAP[extension]) {
      return MEDIA_EXTENSION_MIME_MAP[extension];
    }
  }

  return FALLBACK_KIND_MIME[kind];
};

const getMediaRenderElement = (element: Element) => {
  if (element instanceof HTMLSourceElement) {
    const parent = element.parentElement;
    if (parent instanceof HTMLPictureElement) {
      return parent.querySelector("img") ?? parent;
    }
    return parent ?? element;
  }

  if (element instanceof HTMLPictureElement) {
    return element.querySelector("img") ?? element;
  }

  return element;
};

const getRenderedSize = (element: Element) => {
  const renderElement = getMediaRenderElement(element);
  const rect = renderElement.getBoundingClientRect();
  let width = Math.max(0, Math.round(rect.width));
  let height = Math.max(0, Math.round(rect.height));

  if (width > 0 || height > 0) {
    return { width, height };
  }

  if (renderElement instanceof HTMLElement) {
    width = Math.max(width, renderElement.offsetWidth, renderElement.clientWidth);
    height = Math.max(height, renderElement.offsetHeight, renderElement.clientHeight);
  }

  if (renderElement instanceof HTMLImageElement) {
    width = Math.max(width, renderElement.naturalWidth);
    height = Math.max(height, renderElement.naturalHeight);
  } else if (renderElement instanceof HTMLVideoElement) {
    width = Math.max(width, renderElement.videoWidth);
    height = Math.max(height, renderElement.videoHeight);
  } else if (renderElement instanceof HTMLCanvasElement) {
    width = Math.max(width, renderElement.width);
    height = Math.max(height, renderElement.height);
  } else if (renderElement instanceof SVGGraphicsElement) {
    try {
      const box = renderElement.getBBox();
      width = Math.max(width, Math.round(box.width));
      height = Math.max(height, Math.round(box.height));
    } catch {
      // ignore unsupported SVG geometry reads
    }
  }

  if (width === 0 && height === 0) {
    const computed = window.getComputedStyle(renderElement);
    const computedWidth = Number.parseFloat(computed.width);
    const computedHeight = Number.parseFloat(computed.height);
    if (Number.isFinite(computedWidth) && computedWidth > 0) {
      width = Math.round(computedWidth);
    }
    if (Number.isFinite(computedHeight) && computedHeight > 0) {
      height = Math.round(computedHeight);
    }
  }

  return {
    width: Math.max(0, width),
    height: Math.max(0, height),
  };
};

const collectMediaOnElement = (element: Element): MediaItem[] => {
  const mediaItems: MediaItem[] = [];
  const pushMedia = (
    entry: Omit<MediaItem, "selector" | "url" | "mimeType"> & { url?: string; mimeTypeHint?: string; mimeType?: string }
  ) => {
    const normalizedUrl = normalizeMediaUrl(entry.url ?? "");
    const mimeType = entry.mimeType ?? inferMediaMimeType(entry.kind, normalizedUrl, entry.mimeTypeHint);
    mediaItems.push({
      element: entry.element,
      kind: entry.kind,
      url: normalizedUrl,
      mimeType,
      intrinsic: entry.intrinsic,
      rendered: entry.rendered,
      selector: buildSelectorForElement(entry.element),
    });
  };

  const appendBackgroundMedia = (node: Element) => {
    const computed = window.getComputedStyle(node);
    const backgroundImage = computed.backgroundImage;
    if (!backgroundImage || backgroundImage === "none") {
      return;
    }
    const matches = Array.from(backgroundImage.matchAll(/url\((['"]?)(.*?)\1\)/g));
    matches.forEach((match) => {
      const url = match[2];
      if (!url) {
        return;
      }
      pushMedia({
        element: node,
        kind: "background",
        url,
        intrinsic: null,
        rendered: getRenderedSize(node),
      });
    });
  };

  if (element instanceof HTMLPictureElement) {
    const pictureRendered = getRenderedSize(element);
    const image = element.querySelector<HTMLImageElement>(":scope > img");
    pushMedia({
      element,
      kind: "picture",
      url: image?.currentSrc || image?.src || "",
      mimeTypeHint: "image/*",
      intrinsic: image ? { width: image.naturalWidth, height: image.naturalHeight } : null,
      rendered: pictureRendered,
    });
    element.querySelectorAll(":scope > source").forEach((source) => {
      if (!(source instanceof HTMLSourceElement)) {
        return;
      }
      pushMedia({
        element: source,
        kind: "source",
        url: source.src || getPrimarySrcsetUrl(source.srcset),
        mimeTypeHint: source.type,
        intrinsic: null,
        rendered: getRenderedSize(source),
      });
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLImageElement) {
    pushMedia({
      element,
      kind: "image",
      url: element.currentSrc || element.src,
      intrinsic: { width: element.naturalWidth, height: element.naturalHeight },
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLVideoElement) {
    pushMedia({
      element,
      kind: "video",
      url: element.currentSrc || element.src,
      intrinsic: { width: element.videoWidth, height: element.videoHeight },
      rendered: getRenderedSize(element),
    });
    element.querySelectorAll(":scope > source").forEach((source) => {
      if (!(source instanceof HTMLSourceElement)) {
        return;
      }
      pushMedia({
        element: source,
        kind: "source",
        url: source.src || getPrimarySrcsetUrl(source.srcset),
        mimeTypeHint: source.type || "video/*",
        intrinsic: null,
        rendered: getRenderedSize(source),
      });
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLAudioElement) {
    pushMedia({
      element,
      kind: "audio",
      url: element.currentSrc || element.src,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    element.querySelectorAll(":scope > source").forEach((source) => {
      if (!(source instanceof HTMLSourceElement)) {
        return;
      }
      pushMedia({
        element: source,
        kind: "source",
        url: source.src || getPrimarySrcsetUrl(source.srcset),
        mimeTypeHint: source.type || "audio/*",
        intrinsic: null,
        rendered: getRenderedSize(source),
      });
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLSourceElement) {
    pushMedia({
      element,
      kind: "source",
      url: element.src || getPrimarySrcsetUrl(element.srcset),
      mimeTypeHint: element.type,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
  } else if (element instanceof HTMLIFrameElement) {
    pushMedia({
      element,
      kind: "iframe",
      url: element.src,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLEmbedElement) {
    pushMedia({
      element,
      kind: "embed",
      url: element.src,
      mimeTypeHint: element.type,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLObjectElement) {
    pushMedia({
      element,
      kind: "object",
      url: element.data,
      mimeTypeHint: element.type,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof SVGElement && element.tagName.toLowerCase() === "svg") {
    pushMedia({
      element,
      kind: "svg",
      url: "",
      mimeType: "image/svg+xml",
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLCanvasElement) {
    pushMedia({
      element,
      kind: "canvas",
      url: "",
      mimeType: "image/png",
      intrinsic: { width: element.width, height: element.height },
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else {
    appendBackgroundMedia(element);
  }

  return mediaItems.filter((item, index, list) => {
    const dedupeKey = `${item.kind}::${item.url || "(none)"}::${item.selector}`;
    return (
      list.findIndex((candidate) => {
        const candidateKey = `${candidate.kind}::${candidate.url || "(none)"}::${candidate.selector}`;
        return candidateKey === dedupeKey;
      }) === index
    );
  });
};

const collectMediaInSubtree = (root: Element, maxScan = 2400) => {
  const queue: Element[] = [root];
  let scanned = 0;
  const collected: MediaItem[] = [];
  const seen = new Set<string>();
  while (queue.length > 0 && scanned < maxScan) {
    const node = queue.shift();
    if (!node) {
      break;
    }
    scanned += 1;
    if (isInfoUiElement(node) || node.hasAttribute("data-wilderness-info")) {
      continue;
    }
    const items = collectMediaOnElement(node);
    items.forEach((item) => {
      const key = `${item.kind}::${item.url || "(none)"}::${item.selector}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      collected.push(item);
    });
    queue.push(...Array.from(node.children));
  }
  if (!collected.length) {
    return null;
  }
  return { element: root, items: collected };
};

const findClosestMediaMatch = (element: Element): MediaMatchContext | null => {
  const selectedSubtreeMatch = collectMediaInSubtree(element);
  if (selectedSubtreeMatch) {
    return { element, items: selectedSubtreeMatch.items, relation: "selected" };
  }

  let currentAncestor = element.parentElement;
  while (currentAncestor) {
    const ancestorMatch = collectMediaInSubtree(currentAncestor);
    if (ancestorMatch) {
      return {
        element: currentAncestor,
        items: ancestorMatch.items,
        relation: "ancestor",
      };
    }
    currentAncestor = currentAncestor.parentElement;
  }

  let currentBranch: Element | null = element;
  while (currentBranch?.parentElement) {
    const parent: Element = currentBranch.parentElement;
    const siblings = Array.from(parent.children).filter(
      (child) => child !== currentBranch && !isInfoUiElement(child) && !child.hasAttribute("data-wilderness-info")
    );
    for (const sibling of siblings) {
      const nearbyMatch = collectMediaInSubtree(sibling);
      if (nearbyMatch) {
        return {
          element: nearbyMatch.element,
          items: nearbyMatch.items,
          relation: "nearby",
        };
      }
    }
    currentBranch = parent;
  }

  return null;
};

const getMediaRelationLabel = (relation: MediaMatchContext["relation"]) => {
  if (relation === "ancestor") {
    return "Closest ancestor media";
  }
  if (relation === "nearby") {
    return "Nearby media";
  }
  return "Selected subtree media";
};

type PanelLayoutRecord = {
  right?: { left: number; top: number; width: number; height: number; collapsed: boolean };
  left?: { left: number; top: number; width: number; height: number; collapsed: boolean };
};
type InspectElementState = {
  selector: string;
  styles: Record<string, string>;
  textContent?: string;
  originalTextContent?: string;
};
type PendingInspectState = {
  dirty: boolean;
  elements: InspectElementState[];
};
type PersistedInspectState = {
  version: number;
  elements: InspectElementState[];
};

const PANEL_VIEWPORT_GAP = 16;
const MIN_LEFT_PANEL_WIDTH = 320;
const MIN_LEFT_PANEL_HEIGHT = 320;
const MIN_RIGHT_PANEL_WIDTH = 320;
const MIN_RIGHT_PANEL_HEIGHT = 320;
const DEFAULT_LEFT_PANEL_WIDTH = 416;
const DEFAULT_RIGHT_PANEL_WIDTH = 320;
const MAX_LEFT_PANEL_WIDTH = 1400;
const MAX_RIGHT_PANEL_WIDTH = 1400;
const DEFAULT_PANEL_HEIGHT_RATIO = 0.66;
const MAX_DEFAULT_PANEL_HEIGHT = 720;
const INSPECT_LAYOUT_STORAGE_KEY = "wilderness:inspect-layout";
const INSPECT_LAYOUT_VERSION = 2;
const INSPECT_STATE_STORAGE_KEY = "wilderness:inspect-state";
const INSPECT_STATE_VERSION = 2;
let panelLayoutCache: PanelLayoutRecord = {};
let panelLayoutHydrated = false;
let panelLayoutHydratePromise: Promise<void> | null = null;
let panelLayoutPersistTimeout: number | null = null;

const loadPanelLayoutState = (): PanelLayoutRecord => {
  return panelLayoutCache;
};

const savePanelLayoutState = (next: PanelLayoutRecord) => {
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

const hydratePanelLayoutState = async () => {
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

const clearPersistedPanelLayoutState = async () => {
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

const loadPersistedInspectState = async (): Promise<PersistedInspectState> => {
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

const savePersistedInspectState = async (next: PersistedInspectState) => {
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

const clearPersistedInspectState = async () => {
  try {
    await browser.storage.local.remove(INSPECT_STATE_STORAGE_KEY);
  } catch (error) {
    console.warn("[Inspect] Unable to clear inspect state.", error);
  }
};

const parseTransformFunctionValues = (transform: string, fn: string, fallbackUnit: string): Record<TransformAxis, number> => {
  const output: Record<TransformAxis, number> = { x: 0, y: 0, z: 0 };
  const regex = new RegExp(`${fn}([XYZ])?\\(([^)]*)\\)`, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(transform)) !== null) {
    const axisToken = (match[1] || "").toLowerCase();
    const axis = axisToken === "x" || axisToken === "y" || axisToken === "z" ? axisToken : "x";
    const first = match[2]?.split(",")[0]?.trim() ?? "0";
    const parsed = parseNumericUnit(first);
    if (!parsed) {
      continue;
    }
    if (!parsed.unit || parsed.unit === fallbackUnit) {
      output[axis] = parsed.numeric;
    }
  }
  return output;
};

const parseTransformState = (raw: string): TransformState => {
  const clean = raw.trim();
  const translate = parseTransformFunctionValues(clean, "translate", "px");
  const rotate = parseTransformFunctionValues(clean, "rotate", "deg");
  const skew = parseTransformFunctionValues(clean, "skew", "deg");
  const scale = parseTransformFunctionValues(clean, "scale", "");

  return {
    move: {
      x: { value: translate.x, unit: "px" },
      y: { value: translate.y, unit: "px" },
      z: { value: translate.z, unit: "px" },
    },
    scale: {
      x: { value: scale.x || 1, unit: "" },
      y: { value: scale.y || 1, unit: "" },
      z: { value: scale.z || 1, unit: "" },
    },
    rotate: {
      x: { value: rotate.x, unit: "deg" },
      y: { value: rotate.y, unit: "deg" },
      z: { value: rotate.z, unit: "deg" },
    },
    skew: {
      x: { value: skew.x, unit: "deg" },
      y: { value: skew.y, unit: "deg" },
      z: { value: skew.z, unit: "deg" },
    },
  };
};

const serializeTransformState = (state: TransformState) => {
  const parts: string[] = [];
  const push3D = (
    fn: string,
    values: Record<TransformAxis, { value: number; unit: string }>,
    defaults?: Partial<Record<TransformAxis, number>>
  ) => {
    (["x", "y", "z"] as TransformAxis[]).forEach((axis) => {
      const current = values[axis];
      const defaultValue = defaults?.[axis] ?? 0;
      if (Math.abs(current.value - defaultValue) < 0.000001) {
        return;
      }
      parts.push(`${fn}${axis.toUpperCase()}(${formatNumericValue(current.value)}${current.unit})`);
    });
  };

  push3D("translate", state.move, { x: 0, y: 0, z: 0 });
  push3D("scale", state.scale, { x: 1, y: 1, z: 1 });
  push3D("rotate", state.rotate, { x: 0, y: 0, z: 0 });
  push3D("skew", state.skew, { x: 0, y: 0, z: 0 });
  return parts.length ? parts.join(" ") : "none";
};

const createInfoPanel = ({
  getSelected,
  applyStyle,
}: {
  getSelected: () => Element | null;
  applyStyle: (property: string, value: string, options?: ApplyStyleOptions) => void;
}): PanelHandle => {
  let onTreeSelect: ((element: Element) => void) | null = null;
  let onRestoreState: (() => Promise<boolean>) | null = null;
  const root = document.createElement("div");
  root.className = "wilderness-inspect-panel";
  root.setAttribute("data-collapsed", "false");
  root.style.display = "none";

  const leftPanel = document.createElement("div");
  leftPanel.className = "wilderness-inspect-left";
  leftPanel.setAttribute("data-media-layout", "wide");

  const leftCollapsedWrap = document.createElement("div");
  leftCollapsedWrap.className = "wilderness-inspect-left__collapsed";
  const leftCollapsedButton = document.createElement("button");
  leftCollapsedButton.type = "button";
  leftCollapsedButton.className = "wilderness-inspect-left__collapsed-btn";
  leftCollapsedButton.textContent = "+";
  leftCollapsedButton.setAttribute("aria-label", "Expand inspect tree");
  const leftCollapsedLabel = document.createElement("div");
  leftCollapsedLabel.className = "wilderness-inspect-left__collapsed-label";
  leftCollapsedLabel.textContent = "TREE";
  leftCollapsedWrap.append(leftCollapsedButton);
  leftCollapsedWrap.append(leftCollapsedLabel);
  const addResizeHandles = (panel: HTMLDivElement, className: string, onStart: (event: PointerEvent, edge: string) => void) => {
    const edges = ["top", "right", "bottom", "left", "top-left", "top-right", "bottom-right", "bottom-left"];
    edges.forEach((edge) => {
      const handle = document.createElement("div");
      handle.className = className;
      handle.setAttribute("data-edge", edge);
      handle.addEventListener("pointerdown", (event) => {
        if (!(event instanceof PointerEvent) || event.button !== 0) {
          return;
        }
        onStart(event, edge);
      });
      panel.append(handle);
    });
  };

  const updateMediaLayoutMode = () => {
    const leftPanelWidth = leftPanel.getBoundingClientRect().width;
    leftPanel.setAttribute("data-media-layout", leftPanelWidth > MIN_LEFT_PANEL_WIDTH ? "wide" : "stacked");
  };

  const leftContent = document.createElement("div");
  leftContent.className = "wilderness-inspect-left__content";
  const leftHeader = document.createElement("div");
  leftHeader.className = "wilderness-inspect-left__header";
  const leftTitle = document.createElement("div");
  leftTitle.className = "wilderness-inspect-left__title";
  leftTitle.textContent = "[TREE]";
  const leftCollapseButton = document.createElement("button");
  leftCollapseButton.type = "button";
  leftCollapseButton.className = "wilderness-inspect-left__toggle";
  leftCollapseButton.textContent = "[-]";
  leftCollapseButton.setAttribute("aria-label", "Collapse inspect tree");
  leftHeader.append(leftTitle, leftCollapseButton);

  const treeSection = document.createElement("section");
  treeSection.className = "wilderness-inspect-left__section";
  const treeTitle = document.createElement("div");
  treeTitle.className = "wilderness-inspect-left__section-title";
  treeTitle.textContent = "DOM Tree";
  const treeList = document.createElement("div");
  treeList.className = "wilderness-inspect-tree";
  treeSection.append(treeTitle, treeList);

  const mediaSection = document.createElement("section");
  mediaSection.className = "wilderness-inspect-left__section";
  const mediaTitle = document.createElement("div");
  mediaTitle.className = "wilderness-inspect-left__section-title";
  mediaTitle.textContent = "Quick media";
  const mediaList = document.createElement("div");
  mediaList.className = "wilderness-inspect-media";
  mediaSection.append(mediaTitle, mediaList);

  leftContent.append(leftHeader, treeSection, mediaSection);
  leftPanel.append(leftCollapsedWrap, leftContent);

  const collapsedWrap = document.createElement("div");
  collapsedWrap.className = "wilderness-inspect-panel__collapsed";
  const collapsedButton = document.createElement("button");
  collapsedButton.type = "button";
  collapsedButton.className = "wilderness-inspect-panel__collapsed-btn";
  collapsedButton.textContent = "+";
  const collapsedLabel = document.createElement("div");
  collapsedLabel.className = "wilderness-inspect-panel__collapsed-label";
  collapsedLabel.textContent = "INSP";
  collapsedWrap.append(collapsedButton);
  collapsedWrap.append(collapsedLabel);

  const content = document.createElement("div");
  content.className = "wilderness-inspect-panel__content";

  const header = document.createElement("div");
  header.className = "wilderness-inspect-panel__header";
  const headerTop = document.createElement("div");
  headerTop.className = "wilderness-inspect-panel__header-top";
  const title = document.createElement("div");
  title.className = "wilderness-inspect-panel__title";
  title.textContent = "[INSPECT]";
  const selectorButton = document.createElement("button");
  selectorButton.type = "button";
  selectorButton.className = "wilderness-inspect-panel__selector";
  selectorButton.title = "Copy selector";
  selectorButton.setAttribute("aria-label", "Copy selector");
  const selectorWrap = document.createElement("div");
  selectorWrap.className = "wilderness-inspect-panel__selector-wrap";
  const copyTooltip = document.createElement("span");
  copyTooltip.className = "wilderness-inspect-panel__copy-tooltip";
  copyTooltip.setAttribute("data-visible", "false");
  copyTooltip.textContent = "Copied";
  copyTooltip.setAttribute("aria-hidden", "true");
  selectorWrap.append(selectorButton, copyTooltip);
  const statusTooltip = document.createElement("span");
  statusTooltip.className = "wilderness-inspect-panel__status-tooltip";
  statusTooltip.setAttribute("data-visible", "false");
  statusTooltip.setAttribute("data-tone", "success");
  statusTooltip.setAttribute("aria-hidden", "true");
  selectorWrap.append(statusTooltip);
  const collapseButton = document.createElement("button");
  collapseButton.type = "button";
  collapseButton.className = "wilderness-inspect-panel__toggle";
  collapseButton.textContent = "[-]";
  collapseButton.setAttribute("aria-label", "Collapse inspect panel");
  collapsedButton.setAttribute("aria-label", "Expand inspect panel");
  headerTop.append(title, collapseButton);
  header.append(headerTop, selectorWrap);

  const body = document.createElement("div");
  body.className = "wilderness-inspect-panel__sections";
  content.append(header, body);
  const viewportGap = 16;
  const defaultPanelHeight = () =>
    Math.max(
      MIN_RIGHT_PANEL_HEIGHT,
      Math.min(MAX_DEFAULT_PANEL_HEIGHT, Math.round(window.innerHeight * DEFAULT_PANEL_HEIGHT_RATIO))
    );

  root.append(collapsedWrap, content);
  (document.documentElement ?? document.body)?.append(root);
  (document.documentElement ?? document.body)?.append(leftPanel);

  let copyTimeout: number | null = null;
  let statusTimeout: number | null = null;
  let rightDragPointerId: number | null = null;
  let rightDragOffsetX = 0;
  let rightDragOffsetY = 0;
  let leftDragPointerId: number | null = null;
  let leftDragOffsetX = 0;
  let leftDragOffsetY = 0;
  let onPreviewHover: ((element: Element | null) => void) | null = null;
  let currentTarget: Element | null = null;
  const treeExpansionState = new Map<string, boolean>();
  const modifiedBySelector = new Map<string, Map<string, string>>();
  const textBySelector = new Map<string, { textContent: string; originalTextContent: string }>();
  const TREE_NODE_RENDER_LIMIT = 10000;
  let _currentTreeTarget: Element | null = null;
  const writeLayoutState = () => {
    const rightRect = root.getBoundingClientRect();
    const leftRect = leftPanel.getBoundingClientRect();
    savePanelLayoutState({
      right: {
        left: rightRect.left,
        top: rightRect.top,
        width: rightRect.width,
        height: rightRect.height,
        collapsed: root.getAttribute("data-collapsed") === "true",
      },
      left: {
        left: leftRect.left,
        top: leftRect.top,
        width: leftRect.width,
        height: leftRect.height,
        collapsed: leftPanel.getAttribute("data-collapsed") === "true",
      },
    });
  };

  const getSelectorForTarget = (target: Element | null) => (target ? buildSelectorForElement(target) : null);
  const queryElementBySelector = (selector: string) => {
    try {
      return document.querySelector(selector);
    } catch (error) {
      if (selector.startsWith("#")) {
        const byId = document.getElementById(selector.slice(1));
        if (byId) {
          return byId;
        }
      }
      console.warn("[Inspect] Invalid selector in persisted style state.", { selector, error });
      return null;
    }
  };
  const applyStylesToElement = (element: Element, styles: Map<string, string> | null) => {
    if (!isStyleWritableElement(element)) {
      return;
    }
    if (!styles || styles.size === 0) {
      return;
    }
    styles.forEach((value, property) => {
      if (!value.trim()) {
        element.style.removeProperty(property);
      } else {
        element.style.setProperty(property, value, INLINE_STYLE_PRIORITY);
      }
    });
  };
  const applyTextToElement = (element: Element, textState: { textContent: string; originalTextContent: string } | null) => {
    if (!textState) {
      return;
    }
    element.textContent = textState.textContent;
  };
  const clearStylesFromElement = (element: Element, styles: Map<string, string> | null) => {
    if (!isStyleWritableElement(element) || !styles || styles.size === 0) {
      return;
    }
    styles.forEach((_value, property) => {
      element.style.removeProperty(property);
    });
  };
  const applyModifiedStylesInDocument = () => {
    modifiedBySelector.forEach((styles, selector) => {
      const element = queryElementBySelector(selector);
      if (!element) {
        return;
      }
      applyStylesToElement(element, styles);
    });
    textBySelector.forEach((textState, selector) => {
      const element = queryElementBySelector(selector);
      if (!element) {
        return;
      }
      applyTextToElement(element, textState);
    });
  };
  const clearAllModifiedStylesInDocument = () => {
    modifiedBySelector.forEach((styles, selector) => {
      const element = queryElementBySelector(selector);
      if (!element) {
        return;
      }
      clearStylesFromElement(element, styles);
    });
    textBySelector.forEach((textState, selector) => {
      const element = queryElementBySelector(selector);
      if (!element) {
        return;
      }
      element.textContent = textState.originalTextContent;
    });
  };
  const setDirtyState = (_dirty: boolean) => {};
  const getPendingState = (): PendingInspectState => ({
    dirty: modifiedBySelector.size > 0 || textBySelector.size > 0,
    elements: Array.from(new Set([...modifiedBySelector.keys(), ...textBySelector.keys()])).map((selector) => ({
      selector,
      styles: Object.fromEntries((modifiedBySelector.get(selector) ?? new Map<string, string>()).entries()),
      textContent: textBySelector.get(selector)?.textContent,
      originalTextContent: textBySelector.get(selector)?.originalTextContent,
    })),
  });
  const loadPendingState = (next: PendingInspectState, options?: { applyToDocument?: boolean }) => {
    modifiedBySelector.clear();
    textBySelector.clear();
    next.elements.forEach((entry) => {
      if (!entry.selector || !entry.styles) {
        return;
      }
      modifiedBySelector.set(entry.selector, new Map(Object.entries(entry.styles)));
      if (typeof entry.textContent === "string" && typeof entry.originalTextContent === "string") {
        textBySelector.set(entry.selector, {
          textContent: entry.textContent,
          originalTextContent: entry.originalTextContent,
        });
      }
    });
    if (options?.applyToDocument) {
      applyModifiedStylesInDocument();
    }
    setDirtyState(modifiedBySelector.size > 0 || textBySelector.size > 0);
  };
  const clearPendingState = (options?: { resetAppliedStyles?: boolean }) => {
    if (options?.resetAppliedStyles) {
      clearAllModifiedStylesInDocument();
    }
    modifiedBySelector.clear();
    textBySelector.clear();
    setDirtyState(false);
  };
  const recordPropertyChange = (target: Element | null, property: string, value: string) => {
    const selector = getSelectorForTarget(target);
    if (!selector) {
      return;
    }
    const existing = modifiedBySelector.get(selector) ?? new Map<string, string>();
    if (value.trim()) {
      existing.set(property, value.trim());
      modifiedBySelector.set(selector, existing);
    } else {
      existing.delete(property);
      if (existing.size === 0) {
        modifiedBySelector.delete(selector);
      } else {
        modifiedBySelector.set(selector, existing);
      }
    }
    setDirtyState(modifiedBySelector.size > 0 || textBySelector.size > 0);
  };
  const recordTextChange = (target: Element | null, textContent: string, originalTextContent: string) => {
    const selector = getSelectorForTarget(target);
    if (!selector) {
      return;
    }
    if (textContent === originalTextContent) {
      textBySelector.delete(selector);
    } else {
      textBySelector.set(selector, { textContent, originalTextContent });
    }
    setDirtyState(modifiedBySelector.size > 0 || textBySelector.size > 0);
  };
  const _getChangedTextState = (target: Element | null) => {
    const selector = getSelectorForTarget(target);
    if (!selector) {
      return null;
    }
    return textBySelector.get(selector) ?? null;
  };
  const getChangedValue = (target: Element | null, property: string): string | null => {
    const selector = getSelectorForTarget(target);
    if (!selector) {
      return null;
    }
    const byProperty = modifiedBySelector.get(selector);
    if (!byProperty) {
      return null;
    }
    return byProperty.get(property) ?? null;
  };
  const applySavedElementStyles = (target: Element) => {
    const selector = buildSelectorForElement(target);
    const styles = modifiedBySelector.get(selector);
    applyStylesToElement(target, styles ?? null);
    applyTextToElement(target, textBySelector.get(selector) ?? null);
  };

  const setCopyFeedback = (visible: boolean) => {
    copyTooltip.setAttribute("data-visible", visible ? "true" : "false");
    if (!visible) {
      selectorButton.removeAttribute("data-copying");
      return;
    }

    selectorButton.removeAttribute("data-copying");
    void selectorButton.offsetWidth;
    selectorButton.setAttribute("data-copying", "true");
  };

  const setStatusFeedback = (message: string, tone: "success" | "error" = "success") => {
    if (!message.trim()) {
      statusTooltip.textContent = "";
      statusTooltip.setAttribute("data-visible", "false");
      if (statusTimeout !== null) {
        window.clearTimeout(statusTimeout);
        statusTimeout = null;
      }
      return;
    }
    statusTooltip.textContent = message;
    statusTooltip.setAttribute("data-tone", tone);
    statusTooltip.setAttribute("data-visible", "true");
    if (statusTimeout !== null) {
      window.clearTimeout(statusTimeout);
    }
    statusTimeout = window.setTimeout(() => {
      statusTooltip.setAttribute("data-visible", "false");
      statusTimeout = null;
    }, 1200);
  };

  const clampPanelPosition = (panel: HTMLDivElement, nextLeft: number, nextTop: number) => {
    const maxLeft = Math.max(PANEL_VIEWPORT_GAP, window.innerWidth - panel.offsetWidth - PANEL_VIEWPORT_GAP);
    const maxTop = Math.max(PANEL_VIEWPORT_GAP, window.innerHeight - panel.offsetHeight - PANEL_VIEWPORT_GAP);
    const left = Math.min(Math.max(PANEL_VIEWPORT_GAP, nextLeft), maxLeft);
    const top = Math.min(Math.max(PANEL_VIEWPORT_GAP, nextTop), maxTop);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
  };

  const setPanelPositionByRect = (panel: HTMLDivElement, nextLeft: number, nextTop: number) => {
    clampPanelPosition(panel, nextLeft, nextTop);
    if (!suppressLayoutPersist) {
      writeLayoutState();
    }
  };

  const setRightPanelPosition = (nextLeft: number, nextTop: number) => {
    setPanelPositionByRect(root, nextLeft, nextTop);
  };

  const setLeftPanelPosition = (nextLeft: number, nextTop: number) => {
    setPanelPositionByRect(leftPanel, nextLeft, nextTop);
  };

  const setCollapsed = (next: boolean) => {
    const wasCollapsed = root.getAttribute("data-collapsed") === "true";
    if (next === wasCollapsed) {
      if (root.style.left && root.style.top) {
        const rect = root.getBoundingClientRect();
        setRightPanelPosition(rect.left, rect.top);
      }
      if (!suppressLayoutPersist) {
        writeLayoutState();
      }
      return;
    }

    if (next) {
      const rect = root.getBoundingClientRect();
      const rightEdge = rect.left + rect.width;
      expandedRightSize = clampPanelSize(root, rect.width, rect.height);
      root.setAttribute("data-collapsed", "true");
      root.style.width = "";
      root.style.height = "";
      const collapsedRect = root.getBoundingClientRect();
      setRightPanelPosition(rightEdge - collapsedRect.width, rect.top);
    } else {
      const rect = root.getBoundingClientRect();
      const rightEdge = rect.left + rect.width;
      root.setAttribute("data-collapsed", "false");
      setPanelSize(root, expandedRightSize.width, expandedRightSize.height);
      const expandedRect = root.getBoundingClientRect();
      setRightPanelPosition(rightEdge - expandedRect.width, rect.top);
    }
    if (!suppressLayoutPersist) {
      writeLayoutState();
    }
  };

  const setLeftCollapsed = (next: boolean) => {
    const wasCollapsed = leftPanel.getAttribute("data-collapsed") === "true";
    if (next === wasCollapsed) {
      if (leftPanel.style.left && leftPanel.style.top) {
        const rect = leftPanel.getBoundingClientRect();
        setLeftPanelPosition(rect.left, rect.top);
      }
      if (!suppressLayoutPersist) {
        writeLayoutState();
      }
      return;
    }

    if (next) {
      const rect = leftPanel.getBoundingClientRect();
      expandedLeftSize = clampPanelSize(leftPanel, rect.width, rect.height);
      leftPanel.setAttribute("data-collapsed", "true");
      leftPanel.style.width = "";
      leftPanel.style.height = "";
    } else {
      leftPanel.setAttribute("data-collapsed", "false");
      setPanelSize(leftPanel, expandedLeftSize.width, expandedLeftSize.height);
    }

    if (leftPanel.style.left && leftPanel.style.top) {
      const rect = leftPanel.getBoundingClientRect();
      setLeftPanelPosition(rect.left, rect.top);
    }
    if (!suppressLayoutPersist) {
      writeLayoutState();
    }
  };

  collapseButton.addEventListener("click", () => setCollapsed(true));
  collapsedButton.addEventListener("click", () => setCollapsed(false));
  leftCollapseButton.addEventListener("click", () => setLeftCollapsed(true));
  leftCollapsedButton.addEventListener("click", () => setLeftCollapsed(false));
  addResizeHandles(root, "wilderness-inspect-panel__resize", (event, edge) => {
    startPanelResize(root, event, edge);
  });
  addResizeHandles(leftPanel, "wilderness-inspect-left__resize", (event, edge) => {
    startPanelResize(leftPanel, event, edge);
  });

  headerTop.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent) || event.button !== 0) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest("button,input,select,textarea,a")) {
      return;
    }

    const rect = root.getBoundingClientRect();
    rightDragPointerId = event.pointerId;
    rightDragOffsetX = event.clientX - rect.left;
    rightDragOffsetY = event.clientY - rect.top;
    headerTop.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  const clearRightPanelDrag = (event?: PointerEvent) => {
    if (rightDragPointerId === null) {
      return;
    }
    if (event && event.pointerId !== rightDragPointerId) {
      return;
    }

    if (headerTop.hasPointerCapture(rightDragPointerId)) {
      headerTop.releasePointerCapture(rightDragPointerId);
    }
    rightDragPointerId = null;
  };

  headerTop.addEventListener("pointermove", (event) => {
    if (!(event instanceof PointerEvent) || rightDragPointerId !== event.pointerId) {
      return;
    }
    setRightPanelPosition(event.clientX - rightDragOffsetX, event.clientY - rightDragOffsetY);
  });
  headerTop.addEventListener("pointerup", (event) => clearRightPanelDrag(event));
  headerTop.addEventListener("pointercancel", (event) => clearRightPanelDrag(event));

  leftHeader.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent) || event.button !== 0) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest("button,input,select,textarea,a")) {
      return;
    }

    const rect = leftPanel.getBoundingClientRect();
    leftDragPointerId = event.pointerId;
    leftDragOffsetX = event.clientX - rect.left;
    leftDragOffsetY = event.clientY - rect.top;
    leftHeader.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  const clearLeftPanelDrag = (event?: PointerEvent) => {
    if (leftDragPointerId === null) {
      return;
    }
    if (event && event.pointerId !== leftDragPointerId) {
      return;
    }

    if (leftHeader.hasPointerCapture(leftDragPointerId)) {
      leftHeader.releasePointerCapture(leftDragPointerId);
    }
    leftDragPointerId = null;
  };

  leftHeader.addEventListener("pointermove", (event) => {
    if (!(event instanceof PointerEvent) || leftDragPointerId !== event.pointerId) {
      return;
    }
    setLeftPanelPosition(event.clientX - leftDragOffsetX, event.clientY - leftDragOffsetY);
  });
  leftHeader.addEventListener("pointerup", (event) => clearLeftPanelDrag(event));
  leftHeader.addEventListener("pointercancel", (event) => clearLeftPanelDrag(event));

  collapsedWrap.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent) || event.button !== 0) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest("button")) {
      return;
    }
    const rect = root.getBoundingClientRect();
    rightDragPointerId = event.pointerId;
    rightDragOffsetX = event.clientX - rect.left;
    rightDragOffsetY = event.clientY - rect.top;
    collapsedWrap.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  collapsedWrap.addEventListener("pointermove", (event) => {
    if (!(event instanceof PointerEvent) || rightDragPointerId !== event.pointerId) {
      return;
    }
    setRightPanelPosition(event.clientX - rightDragOffsetX, event.clientY - rightDragOffsetY);
  });
  collapsedWrap.addEventListener("pointerup", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (collapsedWrap.hasPointerCapture(event.pointerId)) {
      collapsedWrap.releasePointerCapture(event.pointerId);
    }
    clearRightPanelDrag(event);
  });
  collapsedWrap.addEventListener("pointercancel", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (collapsedWrap.hasPointerCapture(event.pointerId)) {
      collapsedWrap.releasePointerCapture(event.pointerId);
    }
    clearRightPanelDrag(event);
  });

  leftCollapsedWrap.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent) || event.button !== 0) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest("button")) {
      return;
    }
    const rect = leftPanel.getBoundingClientRect();
    leftDragPointerId = event.pointerId;
    leftDragOffsetX = event.clientX - rect.left;
    leftDragOffsetY = event.clientY - rect.top;
    leftCollapsedWrap.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  leftCollapsedWrap.addEventListener("pointermove", (event) => {
    if (!(event instanceof PointerEvent) || leftDragPointerId !== event.pointerId) {
      return;
    }
    setLeftPanelPosition(event.clientX - leftDragOffsetX, event.clientY - leftDragOffsetY);
  });
  leftCollapsedWrap.addEventListener("pointerup", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (leftCollapsedWrap.hasPointerCapture(event.pointerId)) {
      leftCollapsedWrap.releasePointerCapture(event.pointerId);
    }
    clearLeftPanelDrag(event);
  });
  leftCollapsedWrap.addEventListener("pointercancel", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (leftCollapsedWrap.hasPointerCapture(event.pointerId)) {
      leftCollapsedWrap.releasePointerCapture(event.pointerId);
    }
    clearLeftPanelDrag(event);
  });

  const getTreeLabel = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classPart = element.classList.length ? `.${Array.from(element.classList).slice(0, 2).join(".")}` : "";
    return `${tag}${id}${classPart}`;
  };

  const getTreeChildren = (node: Element) =>
    Array.from(node.children).filter(
      (child) =>
        !isInfoUiElement(child) && !child.hasAttribute("data-wilderness-info") && !NON_TREE_TAGS.has(child.tagName.toUpperCase())
    );

  const ensureSelectedTreePathExpanded = (selected: Element) => {
    const path = getElementTreePath(selected);
    path.forEach((node) => {
      if (node instanceof Element) {
        treeExpansionState.set(buildSelectorForElement(node), true);
      }
    });
  };

  const centerActiveTreeItem = () => {
    const activeItem = treeList.querySelector<HTMLElement>(".wilderness-inspect-tree__item[data-active='true']");
    if (!activeItem) {
      return;
    }

    const listRect = treeList.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    treeList.scrollTop += itemRect.top - listRect.top - (listRect.height / 2 - itemRect.height / 2);
    treeList.scrollLeft += itemRect.left - listRect.left - (listRect.width / 2 - itemRect.width / 2);
  };

  const consumeWheelInsidePanel = (panel: HTMLElement) => {
    panel.addEventListener(
      "wheel",
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const nearestScrollable = target?.closest(
          ".wilderness-inspect-tree, .wilderness-inspect-media, .wilderness-inspect-props-list, .wilderness-inspect-panel__content, .wilderness-inspect-left__content"
        ) as HTMLElement | null;
        const fallbackScroller = panel.querySelector<HTMLElement>(
          ".wilderness-inspect-panel__content, .wilderness-inspect-left__content"
        );
        const scroller = nearestScrollable ?? fallbackScroller;
        if (!scroller || !target || !panel.contains(target)) {
          return;
        }
        const isHorizontal = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const before = isHorizontal ? scroller.scrollLeft : scroller.scrollTop;
        const delta = isHorizontal ? event.deltaX || event.deltaY : event.deltaY;
        if (isHorizontal) {
          scroller.scrollLeft += delta;
        } else {
          scroller.scrollTop += delta;
        }
        const didScroll = (isHorizontal ? scroller.scrollLeft : scroller.scrollTop) !== before;
        event.preventDefault();
        if (didScroll) {
          event.stopPropagation();
        }
      },
      { passive: false, capture: true }
    );
  };

  consumeWheelInsidePanel(root);
  consumeWheelInsidePanel(leftPanel);
  let suppressLayoutPersist = false;
  let expandedLeftSize = { width: DEFAULT_LEFT_PANEL_WIDTH, height: defaultPanelHeight() };
  let expandedRightSize = { width: DEFAULT_RIGHT_PANEL_WIDTH, height: defaultPanelHeight() };

  const getPanelMinWidth = (panel: HTMLDivElement) => (panel === leftPanel ? MIN_LEFT_PANEL_WIDTH : MIN_RIGHT_PANEL_WIDTH);

  const getPanelMinHeight = (panel: HTMLDivElement) => (panel === leftPanel ? MIN_LEFT_PANEL_HEIGHT : MIN_RIGHT_PANEL_HEIGHT);

  const clampPanelSize = (panel: HTMLDivElement, width: number, height: number) => {
    const maxWidth = Math.max(getPanelMinWidth(panel), window.innerWidth - PANEL_VIEWPORT_GAP * 2);
    const maxHeight = Math.max(getPanelMinHeight(panel), window.innerHeight - PANEL_VIEWPORT_GAP * 2);
    return {
      width: Math.min(Math.max(getPanelMinWidth(panel), Math.round(width)), maxWidth),
      height: Math.min(Math.max(getPanelMinHeight(panel), Math.round(height)), maxHeight),
    };
  };

  const setPanelSize = (panel: HTMLDivElement, width: number, height: number) => {
    const next = clampPanelSize(panel, width, height);
    if (panel === leftPanel) {
      expandedLeftSize = next;
    } else {
      expandedRightSize = next;
    }
    if (isPanelCollapsed(panel)) {
      panel.style.width = "";
      panel.style.height = "";
      return;
    }
    panel.style.width = `${next.width}px`;
    panel.style.height = `${next.height}px`;
    if (panel === leftPanel) {
      updateMediaLayoutMode();
    }
  };

  const isPanelCollapsed = (panel: HTMLDivElement) => panel.getAttribute("data-collapsed") === "true";

  const startPanelResize = (panel: HTMLDivElement, event: PointerEvent, edge: string) => {
    if (isPanelCollapsed(panel)) {
      return;
    }
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = panel.getBoundingClientRect();
    const edgeSet = new Set(edge.split("-"));
    const maxWidth = Math.max(getPanelMinWidth(panel), window.innerWidth - PANEL_VIEWPORT_GAP * 2);
    const maxHeight = Math.max(getPanelMinHeight(panel), window.innerHeight - PANEL_VIEWPORT_GAP * 2);
    panel.setPointerCapture(pointerId);
    event.preventDefault();
    event.stopPropagation();

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      let width = startRect.width;
      let height = startRect.height;
      let left = startRect.left;
      let top = startRect.top;

      if (edgeSet.has("left")) {
        width = Math.min(Math.max(getPanelMinWidth(panel), startRect.width - dx), maxWidth);
        left = startRect.right - width;
      } else if (edgeSet.has("right")) {
        width = Math.min(Math.max(getPanelMinWidth(panel), startRect.width + dx), maxWidth);
      }

      if (edgeSet.has("top")) {
        height = Math.min(Math.max(getPanelMinHeight(panel), startRect.height - dy), maxHeight);
        top = startRect.bottom - height;
      } else if (edgeSet.has("bottom")) {
        height = Math.min(Math.max(getPanelMinHeight(panel), startRect.height + dy), maxHeight);
      }

      setPanelSize(panel, width, height);
      setPanelPositionByRect(panel, left, top);
    };

    const onPointerEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) {
        return;
      }
      if (panel.hasPointerCapture(pointerId)) {
        panel.releasePointerCapture(pointerId);
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      writeLayoutState();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
  };

  const rememberExpandedPanelSize = (panel: HTMLDivElement) => {
    const rect = panel.getBoundingClientRect();
    const next = clampPanelSize(panel, rect.width, rect.height);
    if (panel === leftPanel) {
      expandedLeftSize = next;
      return;
    }
    expandedRightSize = next;
  };

  const clampPanelToViewport = (panel: HTMLDivElement) => {
    if (isPanelCollapsed(panel)) {
      const next =
        panel === leftPanel
          ? clampPanelSize(panel, expandedLeftSize.width, expandedLeftSize.height)
          : clampPanelSize(panel, expandedRightSize.width, expandedRightSize.height);
      if (panel === leftPanel) {
        expandedLeftSize = next;
      } else {
        expandedRightSize = next;
      }
      const rect = panel.getBoundingClientRect();
      setPanelPositionByRect(panel, rect.left, rect.top);
      if (panel === leftPanel) {
        updateMediaLayoutMode();
      }
      return;
    }
    const rect = panel.getBoundingClientRect();
    setPanelSize(panel, rect.width, rect.height);
    rememberExpandedPanelSize(panel);
    const nextRect = panel.getBoundingClientRect();
    setPanelPositionByRect(panel, nextRect.left, nextRect.top);
  };

  const ensureDefaultDockSides = () => {
    const leftRect = leftPanel.getBoundingClientRect();
    const rightRect = root.getBoundingClientRect();
    const overlaps =
      leftRect.left < rightRect.right &&
      leftRect.right > rightRect.left &&
      leftRect.top < rightRect.bottom &&
      leftRect.bottom > rightRect.top;
    if (!overlaps) {
      return;
    }

    const preferredRightLeft = Math.max(
      PANEL_VIEWPORT_GAP,
      Math.min(window.innerWidth - rightRect.width - PANEL_VIEWPORT_GAP, window.innerWidth - rightRect.width - viewportGap / 2)
    );
    if (preferredRightLeft <= leftRect.right + PANEL_VIEWPORT_GAP) {
      return;
    }
    setRightPanelPosition(preferredRightLeft, rightRect.top);
  };

  const applyDefaultPanelLayout = () => {
    suppressLayoutPersist = true;
    const safeHeight = defaultPanelHeight();
    const leftWidth = Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(DEFAULT_LEFT_PANEL_WIDTH, 26 * 16));
    const rightWidth = Math.min(MAX_RIGHT_PANEL_WIDTH, Math.max(DEFAULT_RIGHT_PANEL_WIDTH, 20 * 16));
    setLeftCollapsed(false);
    setCollapsed(false);
    setPanelSize(leftPanel, leftWidth, safeHeight);
    setPanelSize(root, rightWidth, safeHeight);
    setLeftPanelPosition(viewportGap, viewportGap);
    setRightPanelPosition(window.innerWidth - rightWidth - viewportGap, viewportGap);
    suppressLayoutPersist = false;
    writeLayoutState();
  };

  const applySavedLayout = () => {
    suppressLayoutPersist = true;
    const layoutState = loadPanelLayoutState();
    if (layoutState.left) {
      setLeftCollapsed(Boolean(layoutState.left.collapsed));
      setPanelSize(
        leftPanel,
        Math.max(MIN_LEFT_PANEL_WIDTH, layoutState.left.width),
        Math.max(MIN_LEFT_PANEL_HEIGHT, layoutState.left.height)
      );
      setLeftPanelPosition(layoutState.left.left, layoutState.left.top);
    } else {
      const safeHeight = defaultPanelHeight();
      const leftWidth = Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(DEFAULT_LEFT_PANEL_WIDTH, 26 * 16));
      setLeftCollapsed(false);
      setPanelSize(leftPanel, leftWidth, safeHeight);
      setLeftPanelPosition(viewportGap, viewportGap);
    }

    if (layoutState.right) {
      setCollapsed(Boolean(layoutState.right.collapsed));
      setPanelSize(
        root,
        Math.max(MIN_RIGHT_PANEL_WIDTH, layoutState.right.width),
        Math.max(MIN_RIGHT_PANEL_HEIGHT, layoutState.right.height)
      );
      setRightPanelPosition(layoutState.right.left, layoutState.right.top);
    } else {
      const safeHeight = defaultPanelHeight();
      const rightWidth = Math.min(MAX_RIGHT_PANEL_WIDTH, Math.max(DEFAULT_RIGHT_PANEL_WIDTH, 20 * 16));
      setCollapsed(false);
      setPanelSize(root, rightWidth, safeHeight);
      setRightPanelPosition(window.innerWidth - rightWidth - viewportGap, viewportGap);
    }
    suppressLayoutPersist = false;
    if (!layoutState.left && !layoutState.right) {
      applyDefaultPanelLayout();
      return;
    }
    ensureDefaultDockSides();
    writeLayoutState();
  };

  void hydratePanelLayoutState().then(() => {
    applySavedLayout();
  });
  const handleViewportResize = () => {
    clampPanelToViewport(root);
    clampPanelToViewport(leftPanel);
    ensureDefaultDockSides();
  };
  window.addEventListener("resize", handleViewportResize);
  const resizeObserver =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          if (suppressLayoutPersist) {
            return;
          }
          clampPanelToViewport(root);
          clampPanelToViewport(leftPanel);
          updateMediaLayoutMode();
          ensureDefaultDockSides();
          writeLayoutState();
        })
      : null;
  resizeObserver?.observe(root);
  resizeObserver?.observe(leftPanel);
  updateMediaLayoutMode();

  const section = (title: string) => {
    const wrap = document.createElement("section");
    wrap.className = "wilderness-inspect-section";
    const titleEl = document.createElement("div");
    titleEl.className = "wilderness-inspect-section__title";
    titleEl.textContent = title;
    const rows = document.createElement("div");
    rows.className = "wilderness-inspect-section__rows";
    wrap.append(titleEl, rows);
    body.append(wrap);
    return rows;
  };

  const addTransformEditor = (rows: HTMLDivElement, property: string, value: string, onReset?: () => void) => {
    const { row } = makeRow("transform");
    const wrap = document.createElement("div");
    wrap.className = "wilderness-inspect-transform";
    const tabs = document.createElement("div");
    tabs.className = "wilderness-inspect-transform__tabs";
    const contentWrap = document.createElement("div");
    const state = parseTransformState(value);
    let mode: TransformMode = "rotate";

    const applyTransform = (options?: ApplyStyleOptions) => {
      const nextValue = serializeTransformState(state);
      applyStyle(property, nextValue, options);
      recordPropertyChange(currentTarget, property, nextValue);
    };

    const renderMode = () => {
      contentWrap.innerHTML = "";
      const unit = mode === "move" ? "px" : mode === "scale" ? "" : "deg";
      const min = mode === "scale" ? 0 : -360;
      const max = mode === "scale" ? 10 : 360;
      (["x", "y", "z"] as TransformAxis[]).forEach((axis) => {
        const axisRow = document.createElement("div");
        axisRow.className = "wilderness-inspect-transform__axis";
        const label = document.createElement("div");
        label.className = "wilderness-inspect-transform__axis-label";
        label.textContent = axis;
        const slider = document.createElement("input");
        slider.type = "range";
        slider.className = "wilderness-inspect-transform__slider";
        slider.min = String(min);
        slider.max = String(max);
        slider.step = "0.1";
        slider.value = String(state[mode][axis].value);
        const valueWrap = document.createElement("div");
        valueWrap.className = "wilderness-inspect-transform__value";
        const input = document.createElement("input");
        input.className = "wilderness-inspect-field";
        input.value = `${formatNumericValue(state[mode][axis].value)}${unit}`;
        setupInputAutoSelect(input);
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            applyTransform();
            return;
          }
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
            return;
          }
          const parsed = parseNumericUnit(input.value) ?? { numeric: 0, unit };
          event.preventDefault();
          const baseStep = unit === "" ? 0.1 : 1;
          const precision = event.ctrlKey || event.metaKey || event.altKey ? 0.1 : event.shiftKey ? 10 : 1;
          const next = parsed.numeric + baseStep * precision * (event.key === "ArrowUp" ? 1 : -1);
          state[mode][axis].value = next;
          slider.value = String(next);
          input.value = `${formatNumericValue(next)}${unit}`;
          applyTransform({ rerender: false });
        });
        const unitEl = document.createElement("div");
        unitEl.className = "wilderness-inspect-transform__unit";
        unitEl.textContent = unit || "unitless";
        slider.addEventListener("input", () => {
          state[mode][axis].value = Number.parseFloat(slider.value) || 0;
          input.value = `${formatNumericValue(state[mode][axis].value)}${unit}`;
          applyTransform({ rerender: false });
        });
        input.addEventListener("input", () => {
          const parsed = parseNumericUnit(input.value);
          if (!parsed) {
            return;
          }
          state[mode][axis].value = parsed.numeric;
          slider.value = String(parsed.numeric);
          applyTransform({ rerender: false });
        });
        valueWrap.append(input, unitEl);
        axisRow.append(label, slider, valueWrap);
        contentWrap.append(axisRow);
      });
    };

    (["move", "scale", "rotate", "skew"] as TransformMode[]).forEach((tabMode) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "wilderness-inspect-transform__tab";
      tab.textContent = tabMode;
      tab.setAttribute("data-active", tabMode === mode ? "true" : "false");
      tab.addEventListener("click", () => {
        mode = tabMode;
        Array.from(tabs.children).forEach((child) => {
          if (child instanceof HTMLElement) {
            child.setAttribute("data-active", child.textContent?.toLowerCase() === mode ? "true" : "false");
          }
        });
        renderMode();
      });
      tabs.append(tab);
    });

    renderMode();
    if (onReset) {
      const controls = document.createElement("div");
      controls.className = "wilderness-inspect-transform__controls";
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "wilderness-inspect-reset-btn";
      resetButton.setAttribute("aria-label", "Reset transform");
      resetButton.title = "Reset transform";
      resetButton.append(createSegmentIcon(Trash2));
      resetButton.addEventListener("click", () => {
        onReset();
      });
      controls.append(resetButton);
      wrap.append(tabs, controls, contentWrap);
    } else {
      wrap.append(tabs, contentWrap);
    }
    appendField(row, wrap);
    rows.append(row);
  };

  const resetStyleProperty = (property: string) => {
    recordPropertyChange(currentTarget, property, "");
    applyStyle(property, "");
  };

  const makeRow = (label: string) => {
    const row = document.createElement("div");
    row.className = "wilderness-inspect-row";
    const labelEl = document.createElement("div");
    labelEl.className = "wilderness-inspect-label";
    labelEl.textContent = label;
    row.append(labelEl);
    return { row, labelEl };
  };

  const appendField = (row: HTMLDivElement, field: HTMLElement) => {
    const control = document.createElement("div");
    control.className = "wilderness-inspect-control";
    control.append(field);
    row.append(control);
  };

  const setupInputAutoSelect = (input: HTMLInputElement) => {
    const maybeSelectAll = () => {
      const inputType = (input.type || "text").toLowerCase();
      if (!AUTO_SELECT_INPUT_TYPES.has(inputType)) {
        return;
      }
      input.select();
    };
    input.addEventListener("focus", maybeSelectAll);
    input.addEventListener("click", maybeSelectAll);
  };

  const renderMediaMetadata = (container: HTMLElement, item: MediaItem) => {
    const rows: Array<[string, string]> = [
      ["kind", item.kind],
      ["mime", item.mimeType || "-"],
      ["iRes", item.intrinsic ? `${item.intrinsic.width}x${item.intrinsic.height}` : "-"],
      ["Res", `${item.rendered.width}x${item.rendered.height}`],
      ["url", item.url || "(inline)"],
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "wilderness-inspect-media__meta-row";
      const labelSpan = document.createElement("span");
      labelSpan.className = "wilderness-inspect-media__meta-label";
      labelSpan.textContent = `${label}:`;
      const valueSpan = document.createElement("span");
      valueSpan.className = "wilderness-inspect-media__meta-value";
      valueSpan.textContent = value;
      row.append(labelSpan, valueSpan);
      container.append(row);
    });
  };

  const createNumericInputController = ({
    input,
    labelEl,
    property,
    initialValue,
    enableDrag = true,
  }: {
    input: HTMLInputElement;
    labelEl: HTMLElement;
    property: string;
    initialValue: string;
    enableDrag?: boolean;
  }) => {
    let inferredUnit = inferNumericUnit(property, parseNumericUnit(initialValue)?.unit ?? "");

    const normalizeNumericValue = (raw: string) => {
      const next = raw.trim();
      if (!next) {
        return "";
      }

      const parsed = parseNumericUnit(next);
      if (!parsed) {
        return next;
      }

      if (parsed.unit) {
        inferredUnit = COMMON_CSS_UNITS.has(parsed.unit) ? parsed.unit : inferNumericUnit(property, parsed.unit);
      } else {
        inferredUnit = inferNumericUnit(property, inferredUnit);
      }

      if (!inferredUnit) {
        return formatNumericValue(parsed.numeric);
      }

      return `${formatNumericValue(parsed.numeric)}${inferredUnit}`;
    };

    const applyNumberValue = (raw: string, options?: ApplyStyleOptions) => {
      const normalized = normalizeNumericValue(raw);
      applyStyle(property, normalized, options);
      recordPropertyChange(currentTarget, property, normalized);
      return normalized;
    };

    const bumpNumberValue = (direction: 1 | -1, precision: "normal" | "fine" | "coarse") => {
      const source = input.value.trim() || initialValue;
      const fallbackUnit = inferNumericUnit(property, inferredUnit);
      const parsed = parseNumericUnit(source) ?? { numeric: 0, unit: fallbackUnit };

      if (parsed.unit) {
        inferredUnit = COMMON_CSS_UNITS.has(parsed.unit) ? parsed.unit : inferNumericUnit(property, parsed.unit);
      } else {
        inferredUnit = inferNumericUnit(property, inferredUnit);
      }

      const baseStep = resolveNumericStep(inferredUnit);
      const multiplier = precision === "fine" ? 0.1 : precision === "coarse" ? 10 : 1;
      const delta = baseStep * multiplier * direction;
      const nextNumeric = parsed.numeric + delta;
      const next = inferredUnit === "" ? formatNumericValue(nextNumeric) : `${formatNumericValue(nextNumeric)}${inferredUnit}`;
      input.value = next;
      input.value = applyNumberValue(next);
    };

    input.addEventListener("input", () => {
      applyNumberValue(input.value, { rerender: false });
    });
    input.addEventListener("change", () => {
      input.value = applyNumberValue(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        input.value = applyNumberValue(input.value);
        return;
      }

      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowUp" ? 1 : -1;
      const precision = event.ctrlKey || event.metaKey || event.altKey ? "fine" : event.shiftKey ? "coarse" : "normal";
      bumpNumberValue(direction, precision);
    });

    if (!enableDrag) {
      return;
    }

    let dragStartX = 0;
    let startValue = normalizeNumericValue(initialValue);
    let dragging = false;

    const pointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      const parsed = parseNumericUnit(startValue);
      if (!parsed) {
        console.warn(`[Inspect] Unable to drag-adjust non-numeric value for "${property}".`, { value: startValue });
        return;
      }

      if (parsed.unit) {
        inferredUnit = COMMON_CSS_UNITS.has(parsed.unit) ? parsed.unit : inferNumericUnit(property, parsed.unit);
      } else {
        inferredUnit = inferNumericUnit(property, inferredUnit);
      }

      const baseStep = resolveNumericStep(inferredUnit);
      const stepMultiplier = event.ctrlKey || event.metaKey ? 0.1 : event.shiftKey ? 10 : 1;
      const step = baseStep * stepMultiplier;
      const next = parsed.numeric + Math.round((event.clientX - dragStartX) / 4) * step;
      const nextValue = inferredUnit === "" ? formatNumericValue(next) : `${formatNumericValue(next)}${inferredUnit}`;
      input.value = nextValue;
      applyStyle(property, nextValue, { rerender: false });
    };

    const pointerUp = () => {
      if (dragging) {
        input.value = applyNumberValue(input.value);
      }
      dragging = false;
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
    };

    labelEl.style.cursor = "ew-resize";
    labelEl.title = "Drag horizontally to change number";
    labelEl.addEventListener("pointerdown", (event) => {
      if (!(event instanceof PointerEvent) || event.button !== 0) {
        return;
      }
      dragging = true;
      dragStartX = event.clientX;
      startValue = normalizeNumericValue(input.value);
      input.value = startValue;
      event.preventDefault();
      window.addEventListener("pointermove", pointerMove);
      window.addEventListener("pointerup", pointerUp);
      window.addEventListener("pointercancel", pointerUp);
    });
  };

  const addTextInput = (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options?: { datalist?: string[]; onCommit?: (next: string) => void; onReset?: () => void }
  ) => {
    const { row } = makeRow(label);
    const input = document.createElement("input");
    input.className = "wilderness-inspect-field";
    input.value = value;
    input.setAttribute("aria-label", `${label} value`);
    setupInputAutoSelect(input);
    if (options?.datalist?.length) {
      const listId = `wilderness-list-${property.replace(/[^a-z0-9]/gi, "")}`;
      input.setAttribute("list", listId);
      const datalist = document.createElement("datalist");
      datalist.id = listId;
      options.datalist.forEach((candidate) => {
        const option = document.createElement("option");
        option.value = candidate;
        datalist.append(option);
      });
      row.append(datalist);
    }

    input.addEventListener("change", () => {
      applyStyle(property, input.value);
      recordPropertyChange(currentTarget, property, input.value);
      options?.onCommit?.(input.value);
    });
    input.addEventListener("input", () => {
      applyStyle(property, input.value, { rerender: false });
      recordPropertyChange(currentTarget, property, input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        applyStyle(property, input.value);
        recordPropertyChange(currentTarget, property, input.value);
        options?.onCommit?.(input.value);
      }
    });
    const field = document.createElement("div");
    field.className = "wilderness-inspect-field-with-reset";
    field.append(input);
    if (options?.onReset) {
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "wilderness-inspect-reset-btn";
      resetButton.setAttribute("aria-label", `Reset ${label}`);
      resetButton.title = `Reset ${label}`;
      resetButton.append(createSegmentIcon(Trash2));
      resetButton.addEventListener("click", () => {
        options.onReset?.();
      });
      field.append(resetButton);
    }
    appendField(row, field);
    rows.append(row);
    return input;
  };

  const addColorInput = (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options?: { onReset?: () => void }
  ) => {
    const { row } = makeRow(label);
    const swatch = document.createElement("input");
    swatch.type = "color";
    swatch.className = "wilderness-inspect-color";
    swatch.value = safePickerColor(value);
    swatch.setAttribute("aria-label", `${label} swatch`);
    const input = document.createElement("input");
    input.className = "wilderness-inspect-field";
    input.value = value;
    input.setAttribute("aria-label", `${label} value`);
    setupInputAutoSelect(input);

    const applyColor = (raw: string, options?: ApplyStyleOptions) => {
      const normalized = normalizeColorValue(raw);
      applyStyle(property, normalized, options);
      recordPropertyChange(currentTarget, property, normalized);
      const pickerColor = toPickerColor(normalized);
      if (pickerColor) {
        swatch.value = pickerColor;
      }
      input.value = normalized;
      return normalized;
    };
    swatch.addEventListener("input", () => {
      applyColor(swatch.value, { rerender: false });
    });
    swatch.addEventListener("change", () => applyColor(swatch.value));
    input.addEventListener("input", () => {
      applyColor(input.value, { rerender: false });
    });
    input.addEventListener("change", () => {
      applyColor(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        applyColor(input.value);
      }
    });
    const colorField = document.createElement("div");
    colorField.className = "wilderness-inspect-color-field";
    colorField.append(swatch, input);
    const field = document.createElement("div");
    field.className = "wilderness-inspect-field-with-reset";
    field.append(colorField);
    if (options?.onReset) {
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "wilderness-inspect-reset-btn";
      resetButton.setAttribute("aria-label", `Reset ${label}`);
      resetButton.title = `Reset ${label}`;
      resetButton.append(createSegmentIcon(Trash2));
      resetButton.addEventListener("click", () => {
        options.onReset?.();
      });
      field.append(resetButton);
    }
    appendField(row, field);
    rows.append(row);
  };

  const addSelect = (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options: Array<{ label: string; value: string }>,
    extra?: { onReset?: () => void }
  ) => {
    const { row } = makeRow(label);
    const select = document.createElement("select");
    select.className = "wilderness-inspect-select";
    select.setAttribute("aria-label", `${label} value`);
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      select.append(option);
    });
    select.value = value;
    select.addEventListener("change", () => {
      applyStyle(property, select.value);
      recordPropertyChange(currentTarget, property, select.value);
    });
    const field = document.createElement("div");
    field.className = "wilderness-inspect-field-with-reset";
    field.append(select);
    if (extra?.onReset) {
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "wilderness-inspect-reset-btn";
      resetButton.setAttribute("aria-label", `Reset ${label}`);
      resetButton.title = `Reset ${label}`;
      resetButton.append(createSegmentIcon(Trash2));
      resetButton.addEventListener("click", () => {
        extra.onReset?.();
      });
      field.append(resetButton);
    }
    appendField(row, field);
    rows.append(row);
  };

  const addNumberInput = (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options?: { onReset?: () => void }
  ) => {
    const { row, labelEl } = makeRow(label);
    const input = document.createElement("input");
    input.className = "wilderness-inspect-field";
    input.value = value;
    input.setAttribute("aria-label", `${label} value`);
    setupInputAutoSelect(input);
    createNumericInputController({
      input,
      labelEl,
      property,
      initialValue: value,
    });

    const field = document.createElement("div");
    field.className = "wilderness-inspect-field-with-reset";
    field.append(input);
    if (options?.onReset) {
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "wilderness-inspect-reset-btn";
      resetButton.setAttribute("aria-label", `Reset ${label}`);
      resetButton.title = `Reset ${label}`;
      resetButton.append(createSegmentIcon(Trash2));
      resetButton.addEventListener("click", () => {
        options.onReset?.();
      });
      field.append(resetButton);
    }
    appendField(row, field);
    rows.append(row);
  };

  const addSegmented = (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options: SegmentedOption[],
    extra?: { onReset?: () => void }
  ) => {
    const { row } = makeRow(label);
    const grid = document.createElement("div");
    grid.className = "wilderness-inspect-segmented";
    grid.style.setProperty("--segment-cols", String(Math.min(options.length, 6)));

    options.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wilderness-inspect-segmented-btn";
      button.append(createSegmentIcon(item.icon));
      button.setAttribute("data-active", value === item.value ? "true" : "false");
      button.title = item.title;
      button.setAttribute("aria-label", `${label} ${item.title}`);
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", () => {
        applyStyle(property, item.value);
        recordPropertyChange(currentTarget, property, item.value);
      });
      grid.append(button);
    });
    const field = document.createElement("div");
    field.className = "wilderness-inspect-field-with-reset";
    field.append(grid);
    if (extra?.onReset) {
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "wilderness-inspect-reset-btn";
      resetButton.setAttribute("aria-label", `Reset ${label}`);
      resetButton.title = `Reset ${label}`;
      resetButton.append(createSegmentIcon(Trash2));
      resetButton.addEventListener("click", () => {
        extra.onReset?.();
      });
      field.append(resetButton);
    }
    appendField(row, field);
    rows.append(row);
  };

  const addInsetInputs = (
    rows: HTMLDivElement,
    label: string,
    values: Array<{ edge: string; property: string; value: string }>
  ) => {
    const { row } = makeRow(label);
    const matrix = document.createElement("div");
    matrix.className = "wilderness-inspect-field-matrix";
    values.forEach((item) => {
      const matrixItem = document.createElement("label");
      matrixItem.className = "wilderness-inspect-matrix-item";
      const edge = document.createElement("span");
      edge.className = "wilderness-inspect-matrix-label";
      edge.textContent = item.edge;
      const input = document.createElement("input");
      input.className = "wilderness-inspect-field";
      input.value = item.value;
      input.setAttribute("aria-label", `${label} ${item.edge} value`);
      setupInputAutoSelect(input);
      createNumericInputController({
        input,
        labelEl: edge,
        property: item.property,
        initialValue: item.value,
      });
      matrixItem.append(edge, input);
      matrix.append(matrixItem);
    });
    appendField(row, matrix);
    rows.append(row);
  };

  selectorButton.addEventListener("click", async () => {
    const selected = getSelected();
    if (!selected) {
      return;
    }

    const selector = buildSelectorForElement(selected);
    try {
      await navigator.clipboard.writeText(selector);
    } catch (error) {
      console.warn("[Inspect] Failed to copy selector.", error);
      return;
    }

    setCopyFeedback(true);
    if (copyTimeout !== null) {
      window.clearTimeout(copyTimeout);
    }
    copyTimeout = window.setTimeout(() => {
      setCopyFeedback(false);
      copyTimeout = null;
    }, 700);
  });

  return {
    root,
    remove: () => {
      if (copyTimeout !== null) {
        window.clearTimeout(copyTimeout);
      }
      if (statusTimeout !== null) {
        window.clearTimeout(statusTimeout);
      }
      window.removeEventListener("resize", handleViewportResize);
      resizeObserver?.disconnect();
      setCopyFeedback(false);
      statusTooltip.setAttribute("data-visible", "false");
      onPreviewHover?.(null);
      root.remove();
      leftPanel.remove();
    },
    setCollapsed,
    setVisible: (visible) => {
      root.style.display = visible ? "flex" : "none";
      leftPanel.style.display = visible ? "flex" : "none";
      if (!visible) {
        return;
      }
      void hydratePanelLayoutState().then(() => {
        applySavedLayout();
      });
      if (!root.style.left) {
        const panelRect = root.getBoundingClientRect();
        setRightPanelPosition(panelRect.left || window.innerWidth - 380, panelRect.top || 8);
      }
      if (!leftPanel.style.left) {
        const leftRect = leftPanel.getBoundingClientRect();
        setLeftPanelPosition(leftRect.left || 8, leftRect.top || 8);
      }
    },
    setSelectionCallback: (callback) => {
      onTreeSelect = callback;
    },
    setPreviewHoverCallback: (callback) => {
      onPreviewHover = callback;
    },
    setRestoreStateCallback: (callback) => {
      onRestoreState = callback;
    },
    setStatusFeedback,
    setDirtyState,
    getPendingState,
    loadPendingState,
    clearPendingState,
    recordTextChange,
    render: (target, options) => {
      const preserveScroll = options?.preserveScroll ?? false;
      const preservedContentScrollTop = preserveScroll ? content.scrollTop : 0;
      const preservedContentScrollLeft = preserveScroll ? content.scrollLeft : 0;
      body.innerHTML = "";
      treeList.innerHTML = "";
      mediaList.innerHTML = "";
      currentTarget = target;
      if (!target) {
        _currentTreeTarget = null;
        setCopyFeedback(false);
        onPreviewHover?.(null);
        selectorButton.textContent = "[NO SELECTION]";
        setStatusFeedback("", "success");
        const restoreWrap = document.createElement("div");
        restoreWrap.className = "wilderness-inspect-restore";
        const restoreButton = document.createElement("button");
        restoreButton.type = "button";
        restoreButton.className = "wilderness-inspect-restore__button";
        restoreButton.textContent = "[RESTORE SAVED STATE]";
        restoreButton.addEventListener("click", async () => {
          if (!onRestoreState) {
            setStatusFeedback("No saved state", "error");
            return;
          }
          restoreButton.disabled = true;
          try {
            const restored = await onRestoreState();
            setStatusFeedback(restored ? "State restored" : "No saved state", restored ? "success" : "error");
          } catch (error) {
            console.warn("[Inspect] Unable to restore saved state.", error);
            setStatusFeedback("Restore failed", "error");
          } finally {
            restoreButton.disabled = false;
          }
        });
        restoreWrap.append(restoreButton);
        body.append(restoreWrap);
        setDirtyState(modifiedBySelector.size > 0 || textBySelector.size > 0);
        return;
      }
      applySavedElementStyles(target);
      _currentTreeTarget = target;
      onPreviewHover?.(null);
      ensureSelectedTreePathExpanded(target);

      const computed = window.getComputedStyle(target);
      const displayValue = (property: string, computedValue: string) => getDisplayStyleValue(target, property, computedValue);
      const displayOrSaved = (property: string, computedValue: string) =>
        getChangedValue(target, property) ?? displayValue(property, computedValue);
      selectorButton.textContent = buildSelectorForElement(target);
      const displayMode = computed.display;
      const isFlexContainer = displayMode.includes("flex");
      const isGridContainer = displayMode.includes("grid");

      const renderTreeNode = (node: Element, depth: number, selected: Element, rendered: { count: number }) => {
        if (rendered.count >= TREE_NODE_RENDER_LIMIT) {
          return;
        }
        rendered.count += 1;
        const children = getTreeChildren(node);
        const hasChildren = children.length > 0;
        const key = buildSelectorForElement(node);
        const expanded = node === selected ? true : (treeExpansionState.get(key) ?? true);
        if (hasChildren) {
          treeExpansionState.set(key, expanded);
        }

        const row = document.createElement("div");
        row.className = "wilderness-inspect-tree__row";
        row.style.paddingLeft = `${depth * 14 + 6}px`;

        const twisty = document.createElement("button");
        twisty.type = "button";
        twisty.className = "wilderness-inspect-tree__twisty";
        if (hasChildren) {
          twisty.textContent = expanded ? "▾" : "▸";
          twisty.setAttribute("aria-label", expanded ? "Collapse tree node" : "Expand tree node");
          twisty.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            treeExpansionState.set(key, !expanded);
            treeList.setAttribute("data-preserve-scroll", "true");
            onTreeSelect?.(selected);
          });
        } else {
          twisty.textContent = " ";
          twisty.disabled = true;
          twisty.setAttribute("data-empty", "true");
        }

        const treeButton = document.createElement("button");
        treeButton.type = "button";
        treeButton.className = "wilderness-inspect-tree__item";
        const nodeLabel = getTreeLabel(node);
        treeButton.textContent = nodeLabel.length > 220 ? `${nodeLabel.slice(0, 220)}…` : nodeLabel;
        if (node === selected) {
          treeButton.setAttribute("data-active", "true");
        }
        treeButton.addEventListener("click", () => {
          onTreeSelect?.(node);
        });
        treeButton.addEventListener("mouseenter", () => {
          onPreviewHover?.(node);
        });
        treeButton.addEventListener("mouseleave", () => {
          onPreviewHover?.(null);
        });

        row.append(twisty, treeButton);
        treeList.append(row);

        if (!hasChildren || !expanded) {
          return;
        }

        children.forEach((child) => renderTreeNode(child, depth + 1, selected, rendered));
      };

      const rendered = { count: 0 };
      const treeRoot = document.body ?? document.documentElement;
      const treeScrollTopBefore = treeList.scrollTop;
      const treeScrollLeftBefore = treeList.scrollLeft;
      renderTreeNode(treeRoot, 0, target, rendered);
      const preserveTreeScroll = treeList.getAttribute("data-preserve-scroll") === "true";
      if (preserveTreeScroll) {
        treeList.removeAttribute("data-preserve-scroll");
      }
      const shouldCenterTreeSelection = !preserveScroll && !preserveTreeScroll;
      if (shouldCenterTreeSelection) {
        centerActiveTreeItem();
      } else {
        treeList.scrollTop = treeScrollTopBefore;
        treeList.scrollLeft = treeScrollLeftBefore;
      }

      const mediaMatch = findClosestMediaMatch(target);
      if (!mediaMatch) {
        const empty = document.createElement("div");
        empty.className = "wilderness-inspect-media__empty";
        empty.textContent = "No media found.";
        mediaList.append(empty);
      } else {
        if (mediaMatch.relation !== "selected") {
          const hint = document.createElement("div");
          hint.className = "wilderness-inspect-media__hint";
          const pathLabel = getMediaRelationLabel(mediaMatch.relation);
          hint.textContent = pathLabel;
          mediaList.append(hint);
        }

        mediaMatch.items.forEach((item) => {
          const entry = document.createElement("div");
          entry.className = "wilderness-inspect-media__item";

          entry.addEventListener("mouseenter", () => {
            onPreviewHover?.(item.element);
          });
          entry.addEventListener("mouseleave", () => {
            onPreviewHover?.(null);
          });

          const preview = document.createElement(item.url ? "a" : "div");
          preview.className = "wilderness-inspect-media__preview";
          if (item.url && preview instanceof HTMLAnchorElement) {
            preview.href = item.url;
            preview.target = "_blank";
            preview.rel = "noopener noreferrer";
          }
          const isImagePreviewable =
            item.kind === "image" || item.kind === "picture" || item.kind === "background" || item.kind === "svg";
          if (isImagePreviewable && item.url) {
            const image = document.createElement("img");
            image.className = "wilderness-inspect-media__img";
            image.src = item.url;
            image.alt = `${item.kind} preview`;
            image.loading = "lazy";
            preview.append(image);
          } else {
            preview.textContent = item.kind.toUpperCase();
            preview.classList.add("wilderness-inspect-media__preview--text");
          }

          const info = document.createElement("div");
          info.className = "wilderness-inspect-media__meta";
          renderMediaMetadata(info, item);
          const selectMediaButton = document.createElement("button");
          selectMediaButton.type = "button";
          selectMediaButton.className = "wilderness-inspect-media__jump";
          selectMediaButton.textContent = "[SELECT]";
          selectMediaButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onTreeSelect?.(getMediaRenderElement(item.element));
          });
          info.append(selectMediaButton);

          entry.append(preview, info);
          mediaList.append(entry);
        });
      }

      const position = section("Position");
      addSelect(position, "display", "display", displayOrSaved("display", computed.display), DISPLAY_OPTIONS, {
        onReset: () => resetStyleProperty("display"),
      });
      addSelect(position, "position", "position", displayOrSaved("position", computed.position), POSITION_OPTIONS, {
        onReset: () => resetStyleProperty("position"),
      });
      addNumberInput(position, "top", "top", displayOrSaved("top", computed.top), { onReset: () => resetStyleProperty("top") });
      addNumberInput(position, "right", "right", displayOrSaved("right", computed.right), {
        onReset: () => resetStyleProperty("right"),
      });
      addNumberInput(position, "bottom", "bottom", displayOrSaved("bottom", computed.bottom), {
        onReset: () => resetStyleProperty("bottom"),
      });
      addNumberInput(position, "left", "left", displayOrSaved("left", computed.left), {
        onReset: () => resetStyleProperty("left"),
      });
      addNumberInput(position, "width", "width", displayOrSaved("width", computed.width), {
        onReset: () => resetStyleProperty("width"),
      });
      addNumberInput(position, "height", "height", displayOrSaved("height", computed.height), {
        onReset: () => resetStyleProperty("height"),
      });
      addTransformEditor(position, "transform", displayOrSaved("transform", computed.transform), () =>
        resetStyleProperty("transform")
      );

      if (isFlexContainer || isGridContainer) {
        const layout = section("Layout");
        if (isFlexContainer) {
          const flexDirectionValue = displayOrSaved("flex-direction", computed.flexDirection);
          const flexAxisOptions = getFlexAxisOptions(flexDirectionValue);
          addSegmented(layout, "flex-direction", "flex-direction", flexDirectionValue, FLEX_DIRECTION_OPTIONS, {
            onReset: () => resetStyleProperty("flex-direction"),
          });
          addSegmented(
            layout,
            "justify-content (main)",
            "justify-content",
            displayOrSaved("justify-content", computed.justifyContent),
            flexAxisOptions.justify,
            { onReset: () => resetStyleProperty("justify-content") }
          );
          addSegmented(
            layout,
            "align-items (cross)",
            "align-items",
            displayOrSaved("align-items", computed.alignItems),
            flexAxisOptions.align,
            { onReset: () => resetStyleProperty("align-items") }
          );
          addSegmented(layout, "flex-wrap", "flex-wrap", displayOrSaved("flex-wrap", computed.flexWrap), WRAP_OPTIONS, {
            onReset: () => resetStyleProperty("flex-wrap"),
          });
        }
        if (isGridContainer) {
          const gridAxisOptions = getGridAxisOptions(computed);
          addSegmented(
            layout,
            "justify-items",
            "justify-items",
            displayOrSaved("justify-items", computed.justifyItems),
            gridAxisOptions.justify,
            { onReset: () => resetStyleProperty("justify-items") }
          );
          addSegmented(
            layout,
            "align-items",
            "align-items",
            displayOrSaved("align-items", computed.alignItems),
            gridAxisOptions.align,
            { onReset: () => resetStyleProperty("align-items") }
          );
        }
        addNumberInput(layout, "gap", "gap", displayOrSaved("gap", computed.gap), { onReset: () => resetStyleProperty("gap") });
        addNumberInput(layout, "row-gap", "row-gap", displayOrSaved("row-gap", computed.rowGap), {
          onReset: () => resetStyleProperty("row-gap"),
        });
        addNumberInput(layout, "column-gap", "column-gap", displayOrSaved("column-gap", computed.columnGap), {
          onReset: () => resetStyleProperty("column-gap"),
        });
      }

      const spacing = section("Spacing");
      addInsetInputs(spacing, "margin", [
        { edge: "Top", property: "margin-top", value: displayOrSaved("margin-top", computed.marginTop) },
        { edge: "Right", property: "margin-right", value: displayOrSaved("margin-right", computed.marginRight) },
        { edge: "Bottom", property: "margin-bottom", value: displayOrSaved("margin-bottom", computed.marginBottom) },
        { edge: "Left", property: "margin-left", value: displayOrSaved("margin-left", computed.marginLeft) },
      ]);
      addInsetInputs(spacing, "padding", [
        { edge: "Top", property: "padding-top", value: displayOrSaved("padding-top", computed.paddingTop) },
        { edge: "Right", property: "padding-right", value: displayOrSaved("padding-right", computed.paddingRight) },
        { edge: "Bottom", property: "padding-bottom", value: displayOrSaved("padding-bottom", computed.paddingBottom) },
        { edge: "Left", property: "padding-left", value: displayOrSaved("padding-left", computed.paddingLeft) },
      ]);

      const appearance = section("Appearance");
      addColorInput(appearance, "color", "color", displayOrSaved("color", computed.color), {
        onReset: () => resetStyleProperty("color"),
      });
      addColorInput(
        appearance,
        "background-color",
        "background-color",
        displayOrSaved("background-color", computed.backgroundColor),
        { onReset: () => resetStyleProperty("background-color") }
      );
      addColorInput(appearance, "border-color", "border-color", displayOrSaved("border-color", computed.borderColor), {
        onReset: () => resetStyleProperty("border-color"),
      });
      addNumberInput(appearance, "border-width", "border-width", displayOrSaved("border-width", computed.borderWidth), {
        onReset: () => resetStyleProperty("border-width"),
      });
      addTextInput(appearance, "border-style", "border-style", displayOrSaved("border-style", computed.borderStyle), {
        onReset: () => resetStyleProperty("border-style"),
      });
      addNumberInput(appearance, "border-radius", "border-radius", displayOrSaved("border-radius", computed.borderRadius), {
        onReset: () => resetStyleProperty("border-radius"),
      });
      addTextInput(appearance, "box-shadow", "box-shadow", displayOrSaved("box-shadow", computed.boxShadow), {
        onReset: () => resetStyleProperty("box-shadow"),
      });
      addNumberInput(appearance, "opacity", "opacity", displayOrSaved("opacity", computed.opacity), {
        onReset: () => resetStyleProperty("opacity"),
      });

      const typography = section("Typography");
      const fontInput = addTextInput(
        typography,
        "font-family",
        "font-family",
        displayOrSaved("font-family", computed.fontFamily),
        {
          datalist: FONT_CATALOG,
          onCommit: async (nextFont) => {
            try {
              const WebFont = await ensureWebFontLoader();
              WebFont.load({
                google: {
                  families: [nextFont],
                },
              });
            } catch (error) {
              console.warn("[Inspect] Unable to load Google Font.", error);
            }
          },
          onReset: () => resetStyleProperty("font-family"),
        }
      );
      fontInput.placeholder = "Inter, Roboto, ...";
      addNumberInput(typography, "font-size", "font-size", displayOrSaved("font-size", computed.fontSize), {
        onReset: () => resetStyleProperty("font-size"),
      });
      addTextInput(typography, "font-weight", "font-weight", displayOrSaved("font-weight", computed.fontWeight), {
        onReset: () => resetStyleProperty("font-weight"),
      });
      addNumberInput(typography, "line-height", "line-height", displayOrSaved("line-height", computed.lineHeight), {
        onReset: () => resetStyleProperty("line-height"),
      });
      addNumberInput(typography, "letter-spacing", "letter-spacing", displayOrSaved("letter-spacing", computed.letterSpacing), {
        onReset: () => resetStyleProperty("letter-spacing"),
      });
      addSegmented(typography, "text-align", "text-align", displayOrSaved("text-align", computed.textAlign), TEXT_ALIGN_OPTIONS, {
        onReset: () => resetStyleProperty("text-align"),
      });

      const allProperties = section("All CSS Props");
      const propsSearch = document.createElement("input");
      propsSearch.type = "search";
      propsSearch.className = "wilderness-inspect-field";
      propsSearch.placeholder = "Search properties";
      propsSearch.setAttribute("aria-label", "Search CSS properties");
      setupInputAutoSelect(propsSearch);
      const propsList = document.createElement("div");
      propsList.className = "wilderness-inspect-props-list";
      const entries = getComputedStyleEntries(target).filter((entry) => !MAIN_SECTION_PROPERTIES.has(entry.property));
      const propRows: Array<{ row: HTMLDivElement; property: string }> = [];
      if (!entries.length) {
        const empty = document.createElement("div");
        empty.className = "wilderness-inspect-props-empty";
        empty.textContent = "No CSS properties available for this element.";
        propsList.append(empty);
      }
      entries.forEach((entry) => {
        const propRow = document.createElement("div");
        propRow.className = "wilderness-inspect-prop-row";
        const propLabel = document.createElement("div");
        propLabel.className = "wilderness-inspect-label";
        propLabel.textContent = entry.property;
        if (isColorProperty(entry.property)) {
          const swatch = document.createElement("input");
          swatch.type = "color";
          swatch.className = "wilderness-inspect-color";
          swatch.setAttribute("aria-label", `${entry.property} color`);
          swatch.value = toPickerColor(entry.value) ?? "#000000";
          swatch.addEventListener("input", () => {
            applyStyle(entry.property, swatch.value, { rerender: false });
            recordPropertyChange(currentTarget, entry.property, swatch.value);
          });
          swatch.addEventListener("change", () => {
            applyStyle(entry.property, swatch.value);
            recordPropertyChange(currentTarget, entry.property, swatch.value);
          });
          propRow.append(propLabel, swatch);
        } else {
          const propInput = document.createElement("input");
          propInput.className = "wilderness-inspect-field";
          propInput.value = entry.value;
          propInput.setAttribute("aria-label", `${entry.property} value`);
          setupInputAutoSelect(propInput);
          propInput.addEventListener("input", () => {
            applyStyle(entry.property, propInput.value, { rerender: false });
            recordPropertyChange(currentTarget, entry.property, propInput.value);
          });
          propInput.addEventListener("change", () => {
            applyStyle(entry.property, propInput.value);
            recordPropertyChange(currentTarget, entry.property, propInput.value);
          });
          propInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              applyStyle(entry.property, propInput.value);
              return;
            }

            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
              return;
            }

            const inferredUnit = inferNumericUnit(entry.property, "");
            const parsed = parseNumericUnit(propInput.value) ?? { numeric: 0, unit: inferredUnit };

            event.preventDefault();
            const nextUnit = inferNumericUnit(entry.property, parsed.unit);
            const baseStep = resolveNumericStep(nextUnit);
            const multiplier = event.ctrlKey || event.metaKey || event.altKey ? 0.1 : event.shiftKey ? 10 : 1;
            const delta = baseStep * multiplier * (event.key === "ArrowUp" ? 1 : -1);
            const nextNumeric = parsed.numeric + delta;
            const next = nextUnit === "" ? formatNumericValue(nextNumeric) : `${formatNumericValue(nextNumeric)}${nextUnit}`;
            propInput.value = next;
            applyStyle(entry.property, next);
            recordPropertyChange(currentTarget, entry.property, next);
          });
          propRow.append(propLabel, propInput);
        }
        propsList.append(propRow);
        propRows.push({ row: propRow, property: entry.property.toLowerCase() });
      });
      propsSearch.addEventListener("input", () => {
        const query = propsSearch.value.trim().toLowerCase();
        propRows.forEach(({ row, property }) => {
          row.style.display = !query || property.includes(query) ? "grid" : "none";
        });
      });
      allProperties.append(propsSearch, propsList);
      if (preserveScroll) {
        requestAnimationFrame(() => {
          content.scrollTop = preservedContentScrollTop;
          content.scrollLeft = preservedContentScrollLeft;
        });
      }
    },
  };
};

export const createInfoController = () => {
  const settings: InfoSettings = {
    showActualLayoutDistances: true,
  };

  const state: {
    enabled: boolean;
    hoverTarget: DeepTarget | null;
    previewHoverElement: Element | null;
    selectedTarget: DeepTarget | null;
    selectedElement: Element | null;
    overlay: LayoutOverlayHandle | null;
    persistedLoaded: boolean;
    editingTextElement: HTMLElement | null;
  } = {
    enabled: false,
    hoverTarget: null,
    previewHoverElement: null,
    selectedTarget: null,
    selectedElement: null,
    overlay: null,
    persistedLoaded: false,
    editingTextElement: null,
  };

  const hoverOutline = createOutline("hover");
  const selectedOutline = createOutline("pinned");
  const startInlineTextEdit = (element: Element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    if (isInfoUiElement(element)) {
      return;
    }
    const text = (element.textContent ?? "").trim();
    if (!text) {
      return;
    }
    state.editingTextElement = element;
    const originalText = element.textContent ?? "";
    element.setAttribute("contenteditable", "plaintext-only");
    element.setAttribute("data-wilderness-editing-text", "true");
    element.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const finish = () => {
      const edited = element.textContent ?? "";
      element.removeAttribute("contenteditable");
      element.removeAttribute("data-wilderness-editing-text");
      panel.recordTextChange(element, edited, originalText);
      state.editingTextElement = null;
      panel.render(state.selectedElement, { preserveScroll: true });
    };
    element.addEventListener(
      "blur",
      () => {
        finish();
      },
      { once: true }
    );
    element.addEventListener(
      "keydown",
      (event) => {
        if (!(event instanceof KeyboardEvent)) {
          return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          element.blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          element.textContent = originalText;
          element.blur();
        }
      },
      { once: true }
    );
  };
  const panel = createInfoPanel({
    getSelected: () => state.selectedElement,
    applyStyle: (property, value, options) => {
      if (!isStyleWritableElement(state.selectedElement)) {
        console.warn("[Inspect] Selected element cannot accept inline style updates.");
        return;
      }

      const next = value.trim();
      if (!next) {
        state.selectedElement.style.removeProperty(property);
      } else {
        state.selectedElement.style.setProperty(property, next, INLINE_STYLE_PRIORITY);
        const applied = state.selectedElement.style.getPropertyValue(property).trim();
        if (!applied) {
          console.warn(`[Inspect] Failed to apply style "${property}: ${next}".`);
        }
      }
      if (options?.rerender !== false) {
        panel.render(state.selectedElement, { preserveScroll: true });
      }
      if (state.selectedTarget) {
        const rect = getSafeRect(state.selectedTarget, "selected outline");
        if (rect) {
          showOutline(selectedOutline, rect);
        }
      } else if (state.selectedElement) {
        showOutline(selectedOutline, state.selectedElement.getBoundingClientRect());
      }
      if (state.overlay && state.selectedElement) {
        state.overlay.update(state.selectedElement, { showActualDistances: settings.showActualLayoutDistances });
      }
    },
  });

  const restoreState = async () => {
    const persisted = await loadPersistedInspectState();
    panel.loadPendingState({ dirty: persisted.elements.length > 0, elements: persisted.elements }, { applyToDocument: true });
    state.persistedLoaded = true;
    if (state.selectedElement) {
      panel.render(state.selectedElement, { preserveScroll: true });
      if (state.overlay) {
        state.overlay.update(state.selectedElement, { showActualDistances: settings.showActualLayoutDistances });
      }
    } else {
      panel.render(null, { preserveScroll: true });
    }
    return persisted.elements.length > 0;
  };
  const saveState = async () => {
    const pending = panel.getPendingState();
    try {
      await savePersistedInspectState({
        version: INSPECT_STATE_VERSION,
        elements: pending.elements,
      });
      panel.setStatusFeedback("State saved", "success");
    } catch (error) {
      console.warn("[Inspect] Unable to save state.", error);
      panel.setStatusFeedback("Save failed", "error");
    }
  };
  const clearState = async () => {
    try {
      panel.clearPendingState({ resetAppliedStyles: true });
      await clearPersistedInspectState();
      await clearPersistedPanelLayoutState();
      await hydratePanelLayoutState();
      state.persistedLoaded = false;
      panel.setCollapsed(false);
      panel.render(state.selectedElement, { preserveScroll: true });
      panel.setStatusFeedback("State cleared", "success");
    } catch (error) {
      console.warn("[Inspect] Unable to clear state.", error);
      panel.setStatusFeedback("Clear failed", "error");
    }
  };
  const hydratePersistedState = async () => {
    if (state.persistedLoaded) {
      return;
    }
    const persisted = await loadPersistedInspectState();
    panel.loadPendingState({ dirty: persisted.elements.length > 0, elements: persisted.elements }, { applyToDocument: false });
    state.persistedLoaded = true;
    if (state.selectedElement) {
      panel.render(state.selectedElement, { preserveScroll: true });
    }
  };
  panel.setSelectionCallback((element) => {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    const rect = element.getBoundingClientRect();
    const pickX = Math.min(Math.max(0, rect.left + Math.min(10, rect.width / 2)), window.innerWidth - 1);
    const pickY = Math.min(Math.max(0, rect.top + Math.min(10, rect.height / 2)), window.innerHeight - 1);
    const target = getDeepTargetFromPoint(pickX, pickY, false);
    if (!target || getElementForTarget(target) !== element) {
      setSelection(element, element);
      return;
    }
    setSelection(target, element);
  });
  panel.setPreviewHoverCallback((element) => {
    state.previewHoverElement = element;
    if (!state.enabled) {
      return;
    }
    if (!element) {
      hideOutline(hoverOutline);
      return;
    }
    const rect = element.getBoundingClientRect();
    showOutline(hoverOutline, rect);
  });
  panel.setRestoreStateCallback(async () => restoreState());

  const mountParent = document.documentElement ?? document.body;
  if (!mountParent) {
    console.warn("[Inspect] Unable to mount outlines: no document root.");
  } else {
    mountParent.append(hoverOutline, selectedOutline);
  }

  const clearSelection = () => {
    if (state.editingTextElement) {
      state.editingTextElement.blur();
    }
    state.selectedTarget = null;
    state.selectedElement = null;
    state.previewHoverElement = null;
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
    }
    panel.render(null);
    hideOutline(selectedOutline);
  };

  const setSelection = (target: SelectionTarget, element: Element) => {
    if (state.editingTextElement) {
      state.editingTextElement.blur();
    }
    state.selectedTarget = isDeepTarget(target) ? target : null;
    state.selectedElement = element;
    state.previewHoverElement = null;

    if (isDeepTarget(target)) {
      const selectedRect = getSafeRect(target, "selected element");
      if (selectedRect) {
        showOutline(selectedOutline, selectedRect);
      } else {
        hideOutline(selectedOutline);
      }
    } else {
      showOutline(selectedOutline, element.getBoundingClientRect());
    }

    if (!state.overlay) {
      state.overlay = createLayoutOverlay();
    }
    state.overlay.update(element, { showActualDistances: settings.showActualLayoutDistances });
    panel.render(element);

    observeRemoval(element, () => {
      if (state.selectedElement === element) {
        clearSelection();
      }
    });
  };

  const handleMove = (event: Event) => {
    if (!state.enabled || !(event instanceof MouseEvent)) {
      return;
    }
    const target = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    const element = getElementForTarget(target);
    if (!target || !element || isOffBounds(target)) {
      state.hoverTarget = null;
      if (!state.previewHoverElement) {
        hideOutline(hoverOutline);
      }
      return;
    }
    if (state.previewHoverElement) {
      return;
    }
    state.hoverTarget = target;
    const rect = getSafeRect(target, "hover outline");
    if (rect) {
      showOutline(hoverOutline, rect);
    } else {
      hideOutline(hoverOutline);
    }
  };

  const handleClick = (event: Event) => {
    if (!state.enabled || !(event instanceof MouseEvent)) {
      return;
    }
    const target = getDeepTargetFromPoint(event.clientX, event.clientY, isDeepPickEvent(event));
    const element = getElementForTarget(target);
    if (!target || !element || isOffBounds(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelection(target, element);
  };

  const handleDoubleClick = (event: Event) => {
    if (!state.enabled || !(event instanceof MouseEvent)) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (!target || isInfoUiElement(target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    startInlineTextEdit(target);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!state.enabled || event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    clearSelection();
  };

  const handleMouseBlock = (event: Event) => {
    if (!state.enabled || !(event instanceof MouseEvent)) {
      return;
    }
    if (state.editingTextElement) {
      return;
    }

    const target =
      event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;

    if (target && isInfoUiElement(target)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const refreshVisuals = () => {
    if (!state.enabled) {
      return;
    }

    if (state.previewHoverElement) {
      showOutline(hoverOutline, state.previewHoverElement.getBoundingClientRect());
    } else if (state.hoverTarget) {
      const rect = getSafeRect(state.hoverTarget, "hover outline");
      if (rect) {
        showOutline(hoverOutline, rect);
      }
    }

    if (state.selectedTarget) {
      const rect = getSafeRect(state.selectedTarget, "selected outline");
      if (rect) {
        showOutline(selectedOutline, rect);
      }
    } else if (state.selectedElement) {
      showOutline(selectedOutline, state.selectedElement.getBoundingClientRect());
    }

    if (state.overlay && state.selectedElement) {
      state.overlay.update(state.selectedElement, { showActualDistances: settings.showActualLayoutDistances });
    }
  };

  const enable = () => {
    if (state.enabled) {
      return;
    }
    state.enabled = true;
    ensureInfoStyles();
    panel.setVisible(true);
    panel.render(state.selectedElement, { preserveScroll: true });
    void hydratePersistedState();

    window.addEventListener("mousemove", handleMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("dblclick", handleDoubleClick, true);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", refreshVisuals, true);
    window.addEventListener("resize", refreshVisuals);
    MOUSE_BLOCK_EVENTS.forEach((type) => window.addEventListener(type, handleMouseBlock, true));
  };

  const disable = () => {
    if (!state.enabled) {
      return;
    }
    state.enabled = false;
    clearSelection();
    state.hoverTarget = null;
    hideOutline(hoverOutline);
    hideOutline(selectedOutline);
    panel.setVisible(false);
    removeInfoStyles();

    window.removeEventListener("mousemove", handleMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("dblclick", handleDoubleClick, true);
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("scroll", refreshVisuals, true);
    window.removeEventListener("resize", refreshVisuals);
    MOUSE_BLOCK_EVENTS.forEach((type) => window.removeEventListener(type, handleMouseBlock, true));
  };

  void Promise.all([hydratePanelLayoutState(), hydratePersistedState()]);

  const toggle = (next?: boolean) => {
    if (typeof next === "boolean") {
      if (next) {
        enable();
      } else {
        disable();
      }
      return state.enabled;
    }
    if (state.enabled) {
      disable();
    } else {
      enable();
    }
    return state.enabled;
  };

  return {
    enable,
    disable,
    toggle,
    saveState,
    clearState,
    updateSettings: (next: Partial<InfoSettings>) => {
      settings.showActualLayoutDistances =
        typeof next.showActualLayoutDistances === "boolean" ? next.showActualLayoutDistances : settings.showActualLayoutDistances;
      refreshVisuals();
      panel.render(state.selectedElement, { preserveScroll: true });
    },
    isEnabled: () => state.enabled,
  };
};
