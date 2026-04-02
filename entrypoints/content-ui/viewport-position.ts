type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type OverflowState = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

export const getViewportOverflow = (rect: RectLike, margin = 16): OverflowState => ({
  left: rect.left < margin,
  right: rect.right > window.innerWidth - margin,
  top: rect.top < margin,
  bottom: rect.bottom > window.innerHeight - margin,
});

export const getViewportAdjustment = (rect: RectLike, margin = 16) => {
  let x = 0;
  let y = 0;
  const maxX = window.innerWidth - margin;
  const maxY = window.innerHeight - margin;

  if (rect.left < margin) {
    x = margin - rect.left;
  } else if (rect.right > maxX) {
    x = maxX - rect.right;
  }

  if (rect.top < margin) {
    y = margin - rect.top;
  } else if (rect.bottom > maxY) {
    y = maxY - rect.bottom;
  }

  return { x, y };
};

type PointerPopoverOptions = {
  pointerX: number;
  pointerY: number;
  width: number;
  height: number;
  margin?: number;
  offsetX?: number;
  offsetY?: number;
};

export const getPointerPopoverViewportPosition = ({
  pointerX,
  pointerY,
  width,
  height,
  margin = 16,
  offsetX = 20,
  offsetY = 8,
}: PointerPopoverOptions) => {
  const maxX = window.innerWidth - margin;
  const maxY = window.innerHeight - margin;
  let left = pointerX + offsetX;
  let placement: "right" | "left" = "right";

  if (left + width > maxX) {
    left = pointerX - width - offsetX;
    placement = "left";
  }

  if (left < margin) {
    left = margin;
  } else if (left + width > maxX) {
    left = maxX - width;
  }

  let top = pointerY + offsetY;
  if (top < margin) {
    top = margin;
  } else if (top + height > maxY) {
    top = maxY - height;
  }

  return { left, top, placement };
};
