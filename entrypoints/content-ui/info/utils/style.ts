import { formatHex, parse } from "culori";
import $ from "jquery";
import { createElement, type IconNode } from "lucide";
import { COMMON_CSS_UNITS, UNIT_LESS_NUMERIC_PROPERTIES, VARIABLE_PICKER_MAX_VARIABLES } from "../core/options";
import type { ScopedCssVariable, StyleWritableElement, WebFontGlobal } from "../core/types";

export const parseNumericUnit = (raw: string) => {
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

export const formatNumericValue = (value: number) => {
  const fixed = Number(value.toFixed(6));
  return String(fixed)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
};

export const inferNumericUnit = (property: string, currentUnit: string) => {
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

export const resolveNumericStep = (unit: string) => {
  if (unit === "ms") {
    return 10;
  }
  if (unit === "s") {
    return 0.1;
  }
  return 1;
};

export const isStyleWritableElement = (element: Element | null): element is StyleWritableElement =>
  element instanceof HTMLElement || element instanceof SVGElement;

export const getDisplayStyleValue = (element: Element, property: string, computedValue: string) => {
  if (isStyleWritableElement(element)) {
    const inlineValue = element.style.getPropertyValue(property).trim();
    if (inlineValue) {
      return inlineValue;
    }
  }

  return computedValue;
};

export const normalizeColorValue = (raw: string) => {
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

export const toPickerColor = (raw: string) => {
  const parsed = parse(normalizeColorValue(raw));
  if (!parsed) {
    return null;
  }
  return formatHex(parsed);
};

export const resolvePickerColor = (raw: string, scopeElement: Element | null) => {
  const direct = toPickerColor(raw);
  if (direct) {
    return direct;
  }
  if (!scopeElement || !raw.trim()) {
    return null;
  }

  const probe = document.createElement("span");
  probe.setAttribute("data-wilderness-info", "true");
  probe.style.position = "fixed";
  probe.style.left = "-99999px";
  probe.style.top = "-99999px";
  probe.style.pointerEvents = "none";
  probe.style.opacity = "0";
  probe.style.color = raw;
  let host: Element | null = scopeElement;
  while (host) {
    try {
      host.append(probe);
      return toPickerColor(window.getComputedStyle(probe).color);
    } catch {
      host = host.parentElement;
    } finally {
      probe.remove();
    }
  }

  const fallbackHost = document.documentElement ?? document.body;
  if (!fallbackHost) {
    console.warn("[Inspect] Unable to resolve scoped color preview: no host node available.");
    return null;
  }
  try {
    fallbackHost.append(probe);
    return toPickerColor(window.getComputedStyle(probe).color);
  } catch (error) {
    console.warn("[Inspect] Unable to resolve scoped color preview.", { value: raw, error });
    return null;
  } finally {
    probe.remove();
  }
};

export const safePickerColor = (raw: string, scopeElement: Element | null) => resolvePickerColor(raw, scopeElement) ?? "#000000";

export const isColorProperty = (property: string) => {
  const normalized = property.toLowerCase();
  return normalized.includes("color") || normalized === "fill" || normalized === "stroke";
};

export const ensureWebFontLoader = async () => {
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

export const collectScopedCssVariables = (element: Element | null): ScopedCssVariable[] => {
  if (!element) {
    console.warn("[Inspect] Unable to collect CSS variables without a selected element.");
    return [];
  }

  const computed = window.getComputedStyle(element);
  const variables = new Map<string, string>();
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (!property.startsWith("--")) {
      continue;
    }

    const value = computed.getPropertyValue(property).trim();
    if (!value) {
      continue;
    }
    variables.set(property, value);
    if (variables.size >= VARIABLE_PICKER_MAX_VARIABLES) {
      break;
    }
  }

  return Array.from(variables.entries())
    .map(([name, value]) => ({
      name,
      value,
      previewColor: resolvePickerColor(`var(${name})`, element) ?? resolvePickerColor(value, element),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const createSegmentIcon = (iconNode: IconNode) => {
  const icon = createElement(iconNode, {
    width: 15,
    height: 15,
    stroke: "currentColor",
    "stroke-width": 2,
  });
  return $(icon).addClass("wilderness-inspect-segmented-icon").attr("aria-hidden", "true").get(0) as SVGElement;
};

export const normalizeUnit = (property: string, rawUnit: string) => {
  if (rawUnit) {
    return COMMON_CSS_UNITS.has(rawUnit) ? rawUnit : inferNumericUnit(property, rawUnit);
  }
  return inferNumericUnit(property, rawUnit);
};
