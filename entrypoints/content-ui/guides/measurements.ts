import { createDistance, type DistancePosition } from "./distance.element";
import { getTargetRect } from "./guides-utils";

type MeasurementState = {
  distances: ReturnType<typeof createDistance>[];
};

const state: MeasurementState = {
  distances: [],
};

const createMeasurement = (position: DistancePosition) => {
  const measurement = createDistance();
  measurement.setPosition(position);
  state.distances.push(measurement);
};

export const createMeasurements = (
  anchor: Element | Range,
  target: Element | Range,
) => {
  clearMeasurements();

  const anchorBounds = getTargetRect(anchor);
  const targetBounds = getTargetRect(target);
  const midOffset = 2.5;

  const measurements: DistancePosition[] = [];

  if (anchorBounds.right < targetBounds.left) {
    measurements.push({
      orientation: "horizontal",
      x: anchorBounds.right,
      y: anchorBounds.top + anchorBounds.height / 2 - midOffset,
      length: targetBounds.left - anchorBounds.right,
      distance: targetBounds.left - anchorBounds.right,
    });
  }

  if (
    anchorBounds.right < targetBounds.right &&
    anchorBounds.right > targetBounds.left
  ) {
    measurements.push({
      orientation: "horizontal",
      x: anchorBounds.right,
      y: anchorBounds.top + anchorBounds.height / 2 - midOffset,
      length: targetBounds.right - anchorBounds.right,
      distance: targetBounds.right - anchorBounds.right,
    });
  }

  if (anchorBounds.left > targetBounds.right) {
    measurements.push({
      orientation: "horizontal",
      x: targetBounds.right,
      y: anchorBounds.top + anchorBounds.height / 2 - midOffset,
      length: anchorBounds.left - targetBounds.right,
      distance: anchorBounds.left - targetBounds.right,
    });
  } else if (
    anchorBounds.left > targetBounds.left &&
    anchorBounds.left < targetBounds.right
  ) {
    measurements.push({
      orientation: "horizontal",
      x: targetBounds.left,
      y: anchorBounds.top + anchorBounds.height / 2 - midOffset,
      length: anchorBounds.left - targetBounds.left,
      distance: anchorBounds.left - targetBounds.left,
    });
  }

  if (anchorBounds.top > targetBounds.bottom) {
    measurements.push({
      orientation: "vertical",
      x: anchorBounds.left + anchorBounds.width / 2 - midOffset,
      y: targetBounds.bottom,
      length: anchorBounds.top - targetBounds.bottom,
      distance: anchorBounds.top - targetBounds.bottom,
    });
  }

  if (
    anchorBounds.top > targetBounds.top &&
    anchorBounds.top < targetBounds.bottom
  ) {
    measurements.push({
      orientation: "vertical",
      x: anchorBounds.left + anchorBounds.width / 2 - midOffset,
      y: targetBounds.top,
      length: anchorBounds.top - targetBounds.top,
      distance: anchorBounds.top - targetBounds.top,
    });
  }

  if (anchorBounds.bottom < targetBounds.top) {
    measurements.push({
      orientation: "vertical",
      x: anchorBounds.left + anchorBounds.width / 2 - midOffset,
      y: anchorBounds.bottom,
      length: targetBounds.top - anchorBounds.bottom,
      distance: targetBounds.top - anchorBounds.bottom,
    });
  }

  if (
    anchorBounds.bottom < targetBounds.bottom &&
    anchorBounds.bottom > targetBounds.top
  ) {
    measurements.push({
      orientation: "vertical",
      x: anchorBounds.left + anchorBounds.width / 2 - midOffset,
      y: anchorBounds.bottom,
      length: targetBounds.bottom - anchorBounds.bottom,
      distance: targetBounds.bottom - anchorBounds.bottom,
    });
  }

  if (
    anchorBounds.right > targetBounds.right &&
    anchorBounds.left < targetBounds.left
  ) {
    measurements.push({
      orientation: "horizontal",
      x: targetBounds.right,
      y: anchorBounds.top + anchorBounds.height / 2 - midOffset,
      length: anchorBounds.right - targetBounds.right,
      distance: anchorBounds.right - targetBounds.right,
    });
    measurements.push({
      orientation: "horizontal",
      x: anchorBounds.left,
      y: anchorBounds.top + anchorBounds.height / 2 - midOffset,
      length: targetBounds.left - anchorBounds.left,
      distance: targetBounds.left - anchorBounds.left,
    });
  }

  if (
    anchorBounds.top < targetBounds.top &&
    anchorBounds.bottom > targetBounds.bottom
  ) {
    measurements.push({
      orientation: "vertical",
      x: anchorBounds.left + anchorBounds.width / 2 - midOffset,
      y: anchorBounds.top,
      length: targetBounds.top - anchorBounds.top,
      distance: targetBounds.top - anchorBounds.top,
    });
    measurements.push({
      orientation: "vertical",
      x: anchorBounds.left + anchorBounds.width / 2 - midOffset,
      y: targetBounds.bottom,
      length: anchorBounds.bottom - targetBounds.bottom,
      distance: anchorBounds.bottom - targetBounds.bottom,
    });
  }

  measurements
    .map((measurement) => ({
      ...measurement,
      distance: Math.round(measurement.distance * 100) / 100,
    }))
    .forEach(createMeasurement);
};

export const clearMeasurements = () => {
  state.distances.forEach((node) => node.remove());
  state.distances = [];
};
