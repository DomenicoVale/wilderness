import $ from "jquery";
import { type DeepTarget, getDeepTargetFromPoint, getElementForTarget } from "../../../../lib/deep-pick";

const TOOLBAR_HOST = "wilderness-toolbar";
const INFO_TIP_SELECTOR = ".wilderness-info-tip";
const INFO_OUTLINE_SELECTOR = ".wilderness-info-outline";
const INSPECT_PANEL_SELECTOR = ".wilderness-inspect-panel";
const INSPECT_LEFT_SELECTOR = ".wilderness-inspect-left";
const INSPECT_VARIABLE_POPOVER_SELECTOR = ".wilderness-inspect-var-popover";
const FLEX_LIKE_DISPLAY_VALUES = ["flex", "inline-flex", "-webkit-box", "-webkit-inline-box"];

const isToolbarElement = (el: Element) => {
  if ($(el).closest(TOOLBAR_HOST).length > 0) {
    return true;
  }

  const rootNode = el.getRootNode();
  if (rootNode instanceof ShadowRoot && rootNode.host?.tagName?.toLowerCase() === TOOLBAR_HOST) {
    return true;
  }

  return false;
};

const isGuideElement = (el: Element) =>
  $(el).closest("wilderness-guide-box, wilderness-distance, wilderness-gridlines").length > 0;

export const isInfoUiElement = (el: Element) =>
  isToolbarElement(el) ||
  $(el).closest(INFO_TIP_SELECTOR).length > 0 ||
  $(el).closest(INSPECT_PANEL_SELECTOR).length > 0 ||
  $(el).closest(INSPECT_LEFT_SELECTOR).length > 0 ||
  $(el).closest(INSPECT_VARIABLE_POPOVER_SELECTOR).length > 0 ||
  $(el).closest(INFO_OUTLINE_SELECTOR).length > 0 ||
  isGuideElement(el);

export const isInfoUiEvent = (event: Event) => {
  const candidates = new Set<unknown>();
  candidates.add(event.target);
  if (typeof event.composedPath === "function") {
    event.composedPath().forEach((node) => candidates.add(node));
  }
  for (const candidate of candidates) {
    if (candidate instanceof Element && isInfoUiElement(candidate)) {
      return true;
    }
  }
  return false;
};

export const isOffBounds = (node: DeepTarget | null) => {
  const element = getElementForTarget(node);
  if (!element) {
    return true;
  }

  if (isInfoUiElement(element)) {
    return true;
  }

  if (element.hasAttribute("data-wilderness-info")) {
    return true;
  }

  return element === document.documentElement || element === document.body;
};

export const deepElementFromPoint = (x: number, y: number) => {
  const target = getDeepTargetFromPoint(x, y, false);
  const element = getElementForTarget(target);
  return element ?? null;
};

const desiredPropMap: Record<string, string> = {
  color: "rgb(0, 0, 0)",
  backgroundColor: "rgba(0, 0, 0, 0)",
  backgroundImage: "none",
  backgroundSize: "auto",
  backgroundPosition: "0% 0%",
  borderRadius: "0px",
  boxShadow: "none",
  padding: "0px",
  margin: "0px",
  fontFamily: "auto",
  fontSize: "16px",
  fontWeight: "400",
  textAlign: "start",
  textShadow: "none",
  textTransform: "none",
  lineHeight: "normal",
  letterSpacing: "normal",
  display: "block",
  alignItems: "normal",
  justifyContent: "normal",
  flexDirection: "row",
  flexWrap: "nowrap",
  flexBasis: "auto",
  fill: "rgb(0, 0, 0)",
  stroke: "none",
  gridTemplateColumns: "none",
  gridAutoColumns: "auto",
  gridTemplateRows: "none",
  gridAutoRows: "auto",
  gridTemplateAreas: "none",
  gridArea: "auto",
  gap: "normal",
  gridAutoFlow: "row",
};

export const camelToDash = (camelString = "") => camelString.replace(/([A-Z])/g, ($1) => `-${$1.toLowerCase()}`);

export type StyleEntry = {
  prop: string;
  value: string;
  isInline: boolean;
  swatch?: string;
};

const isTextElement = (el: Element) =>
  el.matches(
    "h1,h2,h3,h4,h5,h6,p,a,dd,dt,li,ol,pre,abbr,cite,dfn,kbd,q,small,input,label,legend,textarea,blockquote,date,button,figcaption,nav,header,footer,em,b,code,mark,time,summary,details"
  );

const isColorProperty = (prop: string) =>
  prop.includes("color") ||
  prop.includes("background-color") ||
  prop.includes("border-color") ||
  prop.includes("Color") ||
  prop.includes("fill") ||
  prop.includes("stroke");

export const getShadowValues = (shadow: string) => /([^)]+\)) ([^\s]+) ([^\s]+) ([^\s]+) ([^\s]+)/.exec(shadow);

export const getTextShadowValues = (shadow: string) => /([^)]+\)) ([^\s]+) ([^\s]+) ([^\s]+)/.exec(shadow);

let warnedFontMeasure = false;
const fontCacheMap = new Map<string, string | undefined>();
export const firstUsableFontFromFamily = (family: string) => {
  if (fontCacheMap.has(family)) {
    return fontCacheMap.get(family);
  }

  const fonts = family.split(",").map((font) => font.trim());
  const canvas = $("<canvas>").get(0);
  if (!(canvas instanceof HTMLCanvasElement)) {
    const fallback = fonts[0]?.replace(/^["']?(.+?)["']?$/i, "$1");
    fontCacheMap.set(family, fallback);
    return fallback;
  }
  const context = canvas.getContext("2d");
  if (!context) {
    if (!warnedFontMeasure) {
      warnedFontMeasure = true;
      console.warn("[Info] Unable to measure font availability.");
    }
    const fallback = fonts[0]?.replace(/^["']?(.+?)["']?$/i, "$1");
    fontCacheMap.set(family, fallback);
    return fallback;
  }

  const match = fonts
    .map((name) => {
      const matches = String(name).match(/^["']?(.+?)["']?$/i);
      return Array.isArray(matches) ? matches[1] : "";
    })
    .map((fontName) => {
      const baselineSize = context.measureText("font-test").width;
      context.font = `12px ${fontName}, sans-serif`;
      return baselineSize !== context.measureText("font-test").width ? fontName : false;
    })
    .filter((value) => value !== false)[0];

  fontCacheMap.set(family, match);
  return match;
};

export const getStyles = (el: Element): StyleEntry[] => {
  if (!(el instanceof HTMLElement)) {
    return [];
  }

  const computedStyle = window.getComputedStyle(el, null);
  const inlineStyle = el.getAttribute("style") ?? "";
  const entryMap = new Map<string, StyleEntry>();
  const setEntry = (prop: string, value: string) => {
    entryMap.set(prop, {
      prop,
      value,
      isInline: inlineStyle.includes(camelToDash(prop)),
      swatch: isColorProperty(camelToDash(prop)) ? value : undefined,
    });
  };

  const borders: Record<string, string> = {};
  Object.keys(desiredPropMap).forEach((prop) => {
    const expected = desiredPropMap[prop];
    const current = computedStyle[prop as keyof CSSStyleDeclaration];
    if (current === undefined) {
      return;
    }

    if (prop === "fontFamily" && !isTextElement(el)) {
      return;
    }

    if (expected !== String(current)) {
      setEntry(prop, String(current));
    }

    if (prop === "borderColor" || prop === "borderWidth" || prop === "borderStyle") {
      borders[prop] = String(current).replace(/, rgba/g, "\rrgba");
    }
  });

  const borderWidth = borders.borderWidth ?? computedStyle.borderWidth;
  if (parseFloat(borderWidth ?? "0") > 0) {
    setEntry("borderColor", borders.borderColor ?? computedStyle.borderColor);
    setEntry("borderStyle", borders.borderStyle ?? computedStyle.borderStyle);
    setEntry("borderWidth", borderWidth ?? computedStyle.borderWidth);
  }

  const display = computedStyle.display;
  if (FLEX_LIKE_DISPLAY_VALUES.some((value) => display.includes(value) || display === value)) {
    setEntry("display", display);
    setEntry("flexDirection", computedStyle.flexDirection);
    setEntry("flexWrap", computedStyle.flexWrap);
    setEntry("alignItems", computedStyle.alignItems);
    setEntry("justifyContent", computedStyle.justifyContent);
    setEntry("alignContent", computedStyle.alignContent);
    setEntry("gap", computedStyle.gap);
    setEntry("rowGap", computedStyle.rowGap);
    setEntry("columnGap", computedStyle.columnGap);
  }

  if (display.includes("grid")) {
    setEntry("display", display);
    setEntry("gridTemplateColumns", computedStyle.gridTemplateColumns);
    setEntry("gridTemplateRows", computedStyle.gridTemplateRows);
    setEntry("gridTemplateAreas", computedStyle.gridTemplateAreas);
    setEntry("gridAutoColumns", computedStyle.gridAutoColumns);
    setEntry("gridAutoRows", computedStyle.gridAutoRows);
    setEntry("gridAutoFlow", computedStyle.gridAutoFlow);
    setEntry("justifyItems", computedStyle.justifyItems);
    setEntry("alignItems", computedStyle.alignItems);
    setEntry("placeItems", computedStyle.placeItems);
    setEntry("justifyContent", computedStyle.justifyContent);
    setEntry("alignContent", computedStyle.alignContent);
    setEntry("gap", computedStyle.gap);
    setEntry("rowGap", computedStyle.rowGap);
    setEntry("columnGap", computedStyle.columnGap);
  }

  if (computedStyle.position !== "static") {
    setEntry("position", computedStyle.position);
    if (computedStyle.top !== "auto") {
      setEntry("top", computedStyle.top);
    }
    if (computedStyle.right !== "auto") {
      setEntry("right", computedStyle.right);
    }
    if (computedStyle.bottom !== "auto") {
      setEntry("bottom", computedStyle.bottom);
    }
    if (computedStyle.left !== "auto") {
      setEntry("left", computedStyle.left);
    }
    if (computedStyle.zIndex !== "auto") {
      setEntry("zIndex", computedStyle.zIndex);
    }
  }

  return Array.from(entryMap.values())
    .map((style) => {
      const prop = camelToDash(style.prop);
      let value = style.value;

      if (prop.includes("background-image")) {
        return {
          ...style,
          prop,
          value,
        };
      }

      if (prop.includes("box-shadow")) {
        const shadowValues = getShadowValues(value);
        if (shadowValues) {
          const [, color, x, y, blur, spread] = shadowValues;
          value = `${color} ${x} ${y} ${blur} ${spread}`;
        }
      }

      if (prop.includes("text-shadow")) {
        const shadowValues = getTextShadowValues(value);
        if (shadowValues) {
          const [, color, x, y, blur] = shadowValues;
          value = `${color} ${x} ${y} ${blur}`;
        }
      }

      if (prop.includes("font-family")) {
        value = firstUsableFontFromFamily(value) ?? value;
      }

      if (prop.includes("grid-template-areas")) {
        value = value.replace(/" "/g, '"\\A"');
      }

      return {
        ...style,
        prop,
        value,
      };
    })
    .sort((a, b) => a.prop.localeCompare(b.prop));
};

export const observeRemoval = (element: Element, callback: () => void) => {
  const parent = element.parentNode ?? document.body;
  if (!parent) {
    console.warn("[Info] Unable to observe removal: missing parent.");
    return;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === element) {
          observer.disconnect();
          callback();
        }
      });
    });
  });

  observer.observe(parent, { childList: true });
};

export const buildSelectorForElement = (element: Element) => {
  const escapeSelector = (value: string) => {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return value.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
  };

  if (element.id) {
    return `#${escapeSelector(element.id)}`;
  }

  const segments: string[] = [];
  let current: Element | null = element;

  while (current) {
    if (current.id) {
      segments.unshift(`#${escapeSelector(current.id)}`);
      break;
    }

    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      segments.unshift(tag);
      break;
    }

    const currentTagName = current.tagName;
    const siblings = Array.from(parent.children).filter((child: Element) => child.tagName === currentTagName);
    const index = siblings.indexOf(current);
    const nth = index >= 0 ? `:nth-of-type(${index + 1})` : "";
    segments.unshift(`${tag}${nth}`);

    const selector = segments.join(" > ");
    try {
      const matches = document.querySelectorAll(selector);
      if (matches.length === 1 && matches[0] === element) {
        return selector;
      }
    } catch (error) {
      console.warn("[Inspect] Unable to test generated selector.", { selector, error });
    }

    current = parent;
  }

  return segments.join(" > ");
};

export type ComputedStyleItem = {
  property: string;
  value: string;
};

export type ScopedCssVariable = {
  name: string;
  value: string;
};

export const getComputedStyleEntries = (element: Element): ComputedStyleItem[] => {
  const computed = window.getComputedStyle(element);
  const entries: ComputedStyleItem[] = [];
  const inlineStyle = element instanceof HTMLElement || element instanceof SVGElement ? element.style : null;
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    const inlineValue = inlineStyle?.getPropertyValue(property).trim();
    const value = inlineValue || computed.getPropertyValue(property).trim();
    entries.push({ property, value });
  }

  return entries.sort((a, b) => a.property.localeCompare(b.property));
};

export const getScopedCssVariables = (element: Element): ScopedCssVariable[] => {
  const computed = window.getComputedStyle(element);
  const variables = new Map<string, string>();

  for (let index = 0; index < computed.length; index += 1) {
    const name = computed.item(index);
    if (!name.startsWith("--")) {
      continue;
    }

    const value = computed.getPropertyValue(name).trim();
    if (!value) {
      continue;
    }

    variables.set(name, value);
  }

  return Array.from(variables.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
