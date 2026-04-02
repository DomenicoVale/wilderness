import { getViewportAdjustment, getViewportOverflow } from "../viewport-position";

type GuideBoxHandle = {
  root: HTMLDivElement;
  setRect: (rect: DOMRect) => void;
  setColor: (color: string) => void;
  setLabelsVisible: (visible: boolean) => void;
  setLabelSide: (widthSide: "top" | "bottom", heightSide: "left" | "right") => void;
  show: () => void;
  hide: () => void;
  remove: () => void;
};

export const createGuideBox = (variant: "selected" | "hover" | "locked"): GuideBoxHandle => {
  const root = document.createElement("div");
  root.className = "wilderness-guide-box";
  root.setAttribute("data-variant", variant);

  const box = document.createElement("div");
  box.className = "wilderness-guide-box__box";

  const widthLabel = document.createElement("div");
  widthLabel.className = "wilderness-guide-box__label wilderness-guide-box__label--width";

  const heightLabel = document.createElement("div");
  heightLabel.className = "wilderness-guide-box__label wilderness-guide-box__label--height";

  root.append(box, widthLabel, heightLabel);
  root.style.display = "none";
  const parent = document.documentElement ?? document.body;
  if (!parent) {
    console.warn("[Guides] Unable to mount guide box: no document root.");
  } else {
    parent.append(root);
  }

  const applyWidthLabelSide = (widthSide: "top" | "bottom") => {
    if (widthSide === "bottom") {
      widthLabel.style.bottom = "auto";
      widthLabel.style.top = "calc(100% + 4px)";
      return;
    }

    widthLabel.style.top = "auto";
    widthLabel.style.bottom = "calc(100% + 4px)";
  };

  const applyHeightLabelSide = (heightSide: "left" | "right") => {
    if (heightSide === "right") {
      heightLabel.style.right = "auto";
      heightLabel.style.left = "calc(100% + 4px)";
      return;
    }

    heightLabel.style.left = "auto";
    heightLabel.style.right = "calc(100% + 4px)";
  };

  const clampLabels = () => {
    const margin = 16;

    if (widthLabel.style.display !== "none") {
      const initialRect = widthLabel.getBoundingClientRect();
      if (initialRect.width > 0 && initialRect.height > 0) {
        const overflow = getViewportOverflow(initialRect, margin);
        if (overflow.top) {
          applyWidthLabelSide("bottom");
        } else if (overflow.bottom) {
          applyWidthLabelSide("top");
        }

        const finalRect = widthLabel.getBoundingClientRect();
        const adjustment = getViewportAdjustment(finalRect, margin);
        widthLabel.style.marginLeft = adjustment.x !== 0 ? `${adjustment.x}px` : "";
      }
    }

    if (heightLabel.style.display !== "none") {
      const initialRect = heightLabel.getBoundingClientRect();
      if (initialRect.width > 0 && initialRect.height > 0) {
        const overflow = getViewportOverflow(initialRect, margin);
        if (overflow.left) {
          applyHeightLabelSide("right");
        } else if (overflow.right) {
          applyHeightLabelSide("left");
        }

        const finalRect = heightLabel.getBoundingClientRect();
        const adjustment = getViewportAdjustment(finalRect, margin);
        heightLabel.style.marginTop = adjustment.y !== 0 ? `${adjustment.y}px` : "";
      }
    }
  };

  const setRect = (rect: DOMRect) => {
    root.style.left = `${rect.left}px`;
    root.style.top = `${rect.top}px`;
    root.style.width = `${rect.width}px`;
    root.style.height = `${rect.height}px`;
    // Reset all label position overrides
    widthLabel.style.top = "";
    widthLabel.style.bottom = "";
    widthLabel.style.marginLeft = "";
    heightLabel.style.left = "";
    heightLabel.style.right = "";
    heightLabel.style.marginTop = "";
    widthLabel.textContent = `${Math.round(rect.width)}`;
    heightLabel.textContent = `${Math.round(rect.height)}`;
    requestAnimationFrame(clampLabels);
  };

  const setLabelSide = (widthSide: "top" | "bottom", heightSide: "left" | "right") => {
    applyWidthLabelSide(widthSide);
    applyHeightLabelSide(heightSide);
  };

  const setColor = (color: string) => {
    box.style.borderColor = color;
    widthLabel.style.background = color;
    heightLabel.style.background = color;
  };

  return {
    root,
    setRect,
    setColor,
    setLabelSide,
    setLabelsVisible: (visible: boolean) => {
      const display = visible ? "inline-flex" : "none";
      widthLabel.style.display = display;
      heightLabel.style.display = display;
    },
    show: () => {
      root.style.display = "block";
    },
    hide: () => {
      root.style.display = "none";
    },
    remove: () => {
      root.remove();
    },
  };
};
