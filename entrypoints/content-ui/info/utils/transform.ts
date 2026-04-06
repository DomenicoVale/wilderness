import type { TransformAxis, TransformState } from "../core/types";
import { formatNumericValue, parseNumericUnit } from "./style";

export { formatNumericValue, inferNumericUnit, parseNumericUnit, resolveNumericStep } from "./style";

const parseTransformFunctionValues = (transform: string, fn: string, fallbackUnit: string): Record<TransformAxis, number> => {
  const output: Record<TransformAxis, number> = { x: 0, y: 0, z: 0 };
  const regex = new RegExp(`${fn}([XYZ])?\\(([^)]*)\\)`, "gi");
  let match = regex.exec(transform);
  while (match !== null) {
    const axisToken = (match[1] || "").toLowerCase();
    const axis = axisToken === "x" || axisToken === "y" || axisToken === "z" ? axisToken : "x";
    const first = match[2]?.split(",")[0]?.trim() ?? "0";
    const parsed = parseNumericUnit(first);
    if (!parsed) {
      match = regex.exec(transform);
      continue;
    }
    if (!parsed.unit || parsed.unit === fallbackUnit) {
      output[axis] = parsed.numeric;
    }
    match = regex.exec(transform);
  }
  return output;
};

export const parseTransformState = (raw: string): TransformState => {
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

export const serializeTransformState = (state: TransformState) => {
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
