import $ from "jquery";
import { type DeepTarget, getTargetRect } from "../../../../lib/deep-pick";
import type { SelectionTarget } from "../core/types";

export const createOutline = (variant: "hover" | "pinned") => {
  const outline = $("<div>").addClass("wilderness-info-outline").attr("data-variant", variant).hide().get(0);
  if (!(outline instanceof HTMLDivElement)) {
    throw new Error("[Inspect] Unable to create outline node.");
  }
  return outline;
};

export const showOutline = (outline: HTMLDivElement, rect: DOMRect) => {
  $(outline).css({
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    display: "block",
  });
};

export const hideOutline = (outline: HTMLDivElement) => {
  $(outline).hide();
};

export const getSafeRect = (target: DeepTarget, context: string) => {
  try {
    return getTargetRect(target, "viewport");
  } catch (error) {
    console.warn(`[Inspect] Unable to read ${context} bounds.`, error);
    return null;
  }
};

export const isDeepTarget = (value: SelectionTarget): value is DeepTarget =>
  Boolean(value && typeof value === "object" && "documentX" in value && "documentY" in value);
