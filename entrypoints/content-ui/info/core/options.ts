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
  FlipHorizontal2,
  FlipVertical2,
  Rows2,
  Rows3,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
} from "lucide";
import type { SegmentedOption, SelectOption } from "./types";

export const MOUSE_BLOCK_EVENTS: Array<keyof WindowEventMap> = [
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

export const FONT_CATALOG = [
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

export const DISPLAY_OPTIONS: SelectOption[] = [
  { label: "block", value: "block" },
  { label: "inline-block", value: "inline-block" },
  { label: "flex", value: "flex" },
  { label: "grid", value: "grid" },
  { label: "inline-flex", value: "inline-flex" },
  { label: "inline-grid", value: "inline-grid" },
];

export const POSITION_OPTIONS: SelectOption[] = [
  { label: "static", value: "static" },
  { label: "relative", value: "relative" },
  { label: "absolute", value: "absolute" },
  { label: "fixed", value: "fixed" },
  { label: "sticky", value: "sticky" },
];

export const FLEX_DIRECTION_OPTIONS: SegmentedOption[] = [
  { icon: ArrowRight, value: "row", title: "row" },
  { icon: ArrowDown, value: "column", title: "column" },
  { icon: ArrowLeft, value: "row-reverse", title: "row-reverse" },
  { icon: ArrowUp, value: "column-reverse", title: "column-reverse" },
];

const JUSTIFY_OPTIONS: SegmentedOption[] = [
  { icon: AlignStartVertical, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterVertical, value: "center", title: "center" },
  { icon: AlignEndVertical, value: "flex-end", title: "flex-end" },
  { icon: Columns2, value: "space-between", title: "space-between" },
  { icon: Columns3, value: "space-around", title: "space-around" },
  { icon: FlipHorizontal2, value: "space-evenly", title: "space-evenly" },
];

const JUSTIFY_OPTIONS_ROW_REVERSE: SegmentedOption[] = [
  { icon: AlignEndVertical, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterVertical, value: "center", title: "center" },
  { icon: AlignStartVertical, value: "flex-end", title: "flex-end" },
  { icon: Columns2, value: "space-between", title: "space-between" },
  { icon: Columns3, value: "space-around", title: "space-around" },
  { icon: FlipHorizontal2, value: "space-evenly", title: "space-evenly" },
];

const JUSTIFY_OPTIONS_COLUMN: SegmentedOption[] = [
  { icon: AlignStartHorizontal, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterHorizontal, value: "center", title: "center" },
  { icon: AlignEndHorizontal, value: "flex-end", title: "flex-end" },
  { icon: Rows2, value: "space-between", title: "space-between" },
  { icon: Rows3, value: "space-around", title: "space-around" },
  { icon: FlipVertical2, value: "space-evenly", title: "space-evenly" },
];

const JUSTIFY_OPTIONS_COLUMN_REVERSE: SegmentedOption[] = [
  { icon: AlignEndHorizontal, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterHorizontal, value: "center", title: "center" },
  { icon: AlignStartHorizontal, value: "flex-end", title: "flex-end" },
  { icon: Rows2, value: "space-between", title: "space-between" },
  { icon: Rows3, value: "space-around", title: "space-around" },
  { icon: FlipVertical2, value: "space-evenly", title: "space-evenly" },
];

const ALIGN_ITEMS_OPTIONS: SegmentedOption[] = [
  { icon: AlignStartHorizontal, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterHorizontal, value: "center", title: "center" },
  { icon: AlignEndHorizontal, value: "flex-end", title: "flex-end" },
  { icon: Rows2, value: "baseline", title: "baseline" },
  { icon: FlipVertical2, value: "stretch", title: "stretch" },
];

const ALIGN_ITEMS_OPTIONS_HORIZONTAL: SegmentedOption[] = [
  { icon: AlignStartVertical, value: "flex-start", title: "flex-start" },
  { icon: AlignCenterVertical, value: "center", title: "center" },
  { icon: AlignEndVertical, value: "flex-end", title: "flex-end" },
  { icon: Columns2, value: "baseline", title: "baseline" },
  { icon: FlipHorizontal2, value: "stretch", title: "stretch" },
];

const GRID_MAIN_AXIS_HORIZONTAL_OPTIONS: SegmentedOption[] = [
  { icon: AlignStartVertical, value: "start", title: "start" },
  { icon: AlignCenterVertical, value: "center", title: "center" },
  { icon: AlignEndVertical, value: "end", title: "end" },
  { icon: FlipHorizontal2, value: "stretch", title: "stretch" },
];

const GRID_MAIN_AXIS_VERTICAL_OPTIONS: SegmentedOption[] = [
  { icon: AlignStartHorizontal, value: "start", title: "start" },
  { icon: AlignCenterHorizontal, value: "center", title: "center" },
  { icon: AlignEndHorizontal, value: "end", title: "end" },
  { icon: FlipVertical2, value: "stretch", title: "stretch" },
];

export const WRAP_OPTIONS: SegmentedOption[] = [
  { icon: Rows2, value: "nowrap", title: "nowrap" },
  { icon: Rows3, value: "wrap", title: "wrap" },
  { icon: Columns2, value: "wrap-reverse", title: "wrap-reverse" },
];

export const TEXT_ALIGN_OPTIONS: SegmentedOption[] = [
  { icon: TextAlignStart, value: "left", title: "left" },
  { icon: TextAlignCenter, value: "center", title: "center" },
  { icon: TextAlignEnd, value: "right", title: "right" },
  { icon: TextAlignJustify, value: "justify", title: "justify" },
];

export const UNIT_LESS_NUMERIC_PROPERTIES = new Set([
  "line-height",
  "font-weight",
  "z-index",
  "opacity",
  "flex-grow",
  "flex-shrink",
  "order",
]);

export const COMMON_CSS_UNITS = new Set(["px", "%", "em", "rem", "vw", "vh", "deg", "s", "ms"]);

export const AUTO_SELECT_INPUT_TYPES = new Set(["", "text", "search", "url", "tel", "password", "email"]);

export const MAIN_SECTION_PROPERTIES = new Set([
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

export const INLINE_STYLE_PRIORITY = "important";
export const VARIABLE_PICKER_MAX_VARIABLES = 500;

export const getFlexAxisOptions = (direction: string) => {
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

export const getGridAxisOptions = (computed: CSSStyleDeclaration): { justify: SegmentedOption[]; align: SegmentedOption[] } => {
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
