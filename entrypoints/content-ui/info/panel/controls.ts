import $ from "jquery";
import { Trash2 } from "lucide";
import { AUTO_SELECT_INPUT_TYPES, COMMON_CSS_UNITS } from "../core/options";
import type { ApplyStyleOptions, SegmentedOption, TransformAxis, TransformMode } from "../core/types";
import {
  createSegmentIcon,
  formatNumericValue,
  inferNumericUnit,
  isColorProperty,
  normalizeColorValue,
  parseNumericUnit,
  resolveNumericStep,
  resolvePickerColor,
  safePickerColor,
} from "../utils/style";
import { parseTransformState, serializeTransformState } from "../utils/transform";

type VariableButtonAppender = (args: {
  field: HTMLDivElement;
  label: string;
  applyVariable: (nextValue: string) => void;
}) => void;

type CreatePanelControlsOptions = {
  body: HTMLDivElement;
  applyStyle: (property: string, value: string, options?: ApplyStyleOptions) => void;
  recordPropertyChange: (target: Element | null, property: string, value: string) => void;
  getCurrentTarget: () => Element | null;
  appendVariableButton: VariableButtonAppender;
};

type TextInputOptions = {
  datalist?: string[];
  onCommit?: (next: string) => void;
  onReset?: () => void;
};

type ResetOptions = {
  onReset?: () => void;
};

export type PanelControls = {
  setupInputAutoSelect: (input: HTMLInputElement) => void;
  section: (title: string) => HTMLDivElement;
  addTextInput: (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options?: TextInputOptions
  ) => HTMLInputElement;
  addColorInput: (rows: HTMLDivElement, label: string, property: string, value: string, options?: ResetOptions) => void;
  addSelect: (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options: Array<{ label: string; value: string }>,
    extra?: ResetOptions
  ) => void;
  addNumberInput: (rows: HTMLDivElement, label: string, property: string, value: string, options?: ResetOptions) => void;
  addSegmented: (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options: SegmentedOption[],
    extra?: ResetOptions
  ) => void;
  addInsetInputs: (rows: HTMLDivElement, label: string, values: Array<{ edge: string; property: string; value: string }>) => void;
  addTransformEditor: (rows: HTMLDivElement, property: string, value: string, onReset?: () => void) => void;
  addAllCssProps: (rows: HTMLDivElement, entries: Array<{ property: string; value: string }>) => void;
};

export const createPanelControls = ({
  body,
  applyStyle,
  recordPropertyChange,
  getCurrentTarget,
  appendVariableButton,
}: CreatePanelControlsOptions): PanelControls => {
  const makeRow = (label: string) => {
    const row = $('<div class="wilderness-inspect-row" />').get(0) as HTMLDivElement;
    const labelEl = $('<div class="wilderness-inspect-label" />').text(label).appendTo(row).get(0) as HTMLDivElement;
    return { row, labelEl };
  };

  const appendField = (row: HTMLDivElement, field: HTMLElement) => {
    $('<div class="wilderness-inspect-control" />').append(field).appendTo(row);
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

  const addResetButton = (field: HTMLDivElement, label: string, onReset?: () => void) => {
    if (!onReset) {
      return;
    }
    const resetButton = $('<button type="button" class="wilderness-inspect-reset-btn" />')
      .attr("aria-label", `Reset ${label}`)
      .attr("title", `Reset ${label}`)
      .get(0) as HTMLButtonElement;
    resetButton.append(createSegmentIcon(Trash2));
    resetButton.addEventListener("click", () => {
      onReset();
    });
    field.append(resetButton);
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
      recordPropertyChange(getCurrentTarget(), property, normalized);
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

  const addTextInput = (rows: HTMLDivElement, label: string, property: string, value: string, options?: TextInputOptions) => {
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

    const applyTextValue = (nextValue: string, applyOptions?: ApplyStyleOptions) => {
      input.value = nextValue;
      applyStyle(property, nextValue, applyOptions);
      recordPropertyChange(getCurrentTarget(), property, nextValue);
    };

    input.addEventListener("change", () => {
      applyTextValue(input.value);
      options?.onCommit?.(input.value);
    });
    input.addEventListener("input", () => {
      applyTextValue(input.value, { rerender: false });
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        applyTextValue(input.value);
        options?.onCommit?.(input.value);
      }
    });
    const field = document.createElement("div");
    field.className = "wilderness-inspect-field-with-reset";
    field.append(input);
    appendVariableButton({
      field,
      label,
      applyVariable: (nextValue) => {
        applyTextValue(nextValue);
        options?.onCommit?.(nextValue);
      },
    });
    addResetButton(field, label, options?.onReset);
    appendField(row, field);
    rows.append(row);
    return input;
  };

  const addColorInput = (rows: HTMLDivElement, label: string, property: string, value: string, options?: ResetOptions) => {
    const { row } = makeRow(label);
    const swatch = document.createElement("input");
    swatch.type = "color";
    swatch.className = "wilderness-inspect-color";
    swatch.value = safePickerColor(value, getCurrentTarget());
    swatch.setAttribute("aria-label", `${label} swatch`);
    const input = document.createElement("input");
    input.className = "wilderness-inspect-field";
    input.value = value;
    input.setAttribute("aria-label", `${label} value`);
    setupInputAutoSelect(input);

    const applyColor = (raw: string, styleOptions?: ApplyStyleOptions) => {
      const normalized = normalizeColorValue(raw);
      applyStyle(property, normalized, styleOptions);
      recordPropertyChange(getCurrentTarget(), property, normalized);
      const pickerColor = resolvePickerColor(normalized, getCurrentTarget());
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
    appendVariableButton({
      field,
      label,
      applyVariable: (nextValue) => {
        applyColor(nextValue);
      },
    });
    addResetButton(field, label, options?.onReset);
    appendField(row, field);
    rows.append(row);
  };

  const addSelect = (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options: Array<{ label: string; value: string }>,
    extra?: ResetOptions
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
      recordPropertyChange(getCurrentTarget(), property, select.value);
    });

    const field = document.createElement("div");
    field.className = "wilderness-inspect-field-with-reset";
    field.append(select);
    appendVariableButton({
      field,
      label,
      applyVariable: (nextValue) => {
        applyStyle(property, nextValue);
        recordPropertyChange(getCurrentTarget(), property, nextValue);
      },
    });
    addResetButton(field, label, extra?.onReset);
    appendField(row, field);
    rows.append(row);
  };

  const addNumberInput = (rows: HTMLDivElement, label: string, property: string, value: string, options?: ResetOptions) => {
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
    appendVariableButton({
      field,
      label,
      applyVariable: (nextValue) => {
        input.value = nextValue;
        applyStyle(property, nextValue);
        recordPropertyChange(getCurrentTarget(), property, nextValue);
      },
    });
    addResetButton(field, label, options?.onReset);
    appendField(row, field);
    rows.append(row);
  };

  const addSegmented = (
    rows: HTMLDivElement,
    label: string,
    property: string,
    value: string,
    options: SegmentedOption[],
    extra?: ResetOptions
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
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        recordPropertyChange(getCurrentTarget(), property, item.value);
        applyStyle(property, item.value);
      });
      grid.append(button);
    });

    const field = document.createElement("div");
    field.className = "wilderness-inspect-field-with-reset";
    field.append(grid);
    appendVariableButton({
      field,
      label,
      applyVariable: (nextValue) => {
        applyStyle(property, nextValue);
        recordPropertyChange(getCurrentTarget(), property, nextValue);
      },
    });
    addResetButton(field, label, extra?.onReset);
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
      recordPropertyChange(getCurrentTarget(), property, nextValue);
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
    const controls = document.createElement("div");
    controls.className = "wilderness-inspect-transform__controls";
    appendVariableButton({
      field: controls,
      label: "transform",
      applyVariable: (nextValue) => {
        applyStyle(property, nextValue);
        recordPropertyChange(getCurrentTarget(), property, nextValue);
      },
    });
    if (onReset) {
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
    }

    wrap.append(tabs, controls, contentWrap);
    appendField(row, wrap);
    rows.append(row);
  };

  const addAllCssProps = (rows: HTMLDivElement, entries: Array<{ property: string; value: string }>) => {
    const propsSearch = document.createElement("input");
    propsSearch.type = "search";
    propsSearch.className = "wilderness-inspect-field";
    propsSearch.placeholder = "Search properties";
    propsSearch.setAttribute("aria-label", "Search CSS properties");
    setupInputAutoSelect(propsSearch);
    const propsList = document.createElement("div");
    propsList.className = "wilderness-inspect-props-list";
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
      const applyVariableValue = (nextValue: string) => {
        applyStyle(entry.property, nextValue);
        recordPropertyChange(getCurrentTarget(), entry.property, nextValue);
      };
      if (isColorProperty(entry.property)) {
        const control = document.createElement("div");
        control.className = "wilderness-inspect-field-with-reset";
        const swatch = document.createElement("input");
        swatch.type = "color";
        swatch.className = "wilderness-inspect-color";
        swatch.setAttribute("aria-label", `${entry.property} color`);
        swatch.value = safePickerColor(entry.value, getCurrentTarget());
        swatch.addEventListener("input", () => {
          applyStyle(entry.property, swatch.value, { rerender: false });
          recordPropertyChange(getCurrentTarget(), entry.property, swatch.value);
        });
        swatch.addEventListener("change", () => {
          applyStyle(entry.property, swatch.value);
          recordPropertyChange(getCurrentTarget(), entry.property, swatch.value);
        });
        control.append(swatch);
        appendVariableButton({
          field: control,
          label: entry.property,
          applyVariable: (nextValue) => {
            applyVariableValue(nextValue);
            const pickerColor = resolvePickerColor(nextValue, getCurrentTarget());
            if (pickerColor) {
              swatch.value = pickerColor;
            }
          },
        });
        propRow.append(propLabel, control);
      } else {
        const control = document.createElement("div");
        control.className = "wilderness-inspect-field-with-reset";
        const propInput = document.createElement("input");
        propInput.className = "wilderness-inspect-field";
        propInput.value = entry.value;
        propInput.setAttribute("aria-label", `${entry.property} value`);
        setupInputAutoSelect(propInput);
        propInput.addEventListener("input", () => {
          applyStyle(entry.property, propInput.value, { rerender: false });
          recordPropertyChange(getCurrentTarget(), entry.property, propInput.value);
        });
        propInput.addEventListener("change", () => {
          applyStyle(entry.property, propInput.value);
          recordPropertyChange(getCurrentTarget(), entry.property, propInput.value);
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
          recordPropertyChange(getCurrentTarget(), entry.property, next);
        });
        control.append(propInput);
        appendVariableButton({
          field: control,
          label: entry.property,
          applyVariable: (nextValue) => {
            propInput.value = nextValue;
            applyVariableValue(nextValue);
          },
        });
        propRow.append(propLabel, control);
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
    rows.append(propsSearch, propsList);
  };

  return {
    setupInputAutoSelect,
    section,
    addTextInput,
    addColorInput,
    addSelect,
    addNumberInput,
    addSegmented,
    addInsetInputs,
    addTransformEditor,
    addAllCssProps,
  };
};
