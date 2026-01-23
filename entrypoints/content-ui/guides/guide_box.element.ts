type GuideBoxHandle = {
  root: HTMLDivElement;
  setRect: (rect: DOMRect) => void;
  show: () => void;
  hide: () => void;
  remove: () => void;
};

export const createGuideBox = (
  variant: "selected" | "hover",
): GuideBoxHandle => {
  const root = document.createElement("div");
  root.className = "wilderness-guide-box";
  root.setAttribute("data-variant", variant);

  const box = document.createElement("div");
  box.className = "wilderness-guide-box__box";

  const widthLabel = document.createElement("div");
  widthLabel.className =
    "wilderness-guide-box__label wilderness-guide-box__label--width";

  const heightLabel = document.createElement("div");
  heightLabel.className =
    "wilderness-guide-box__label wilderness-guide-box__label--height";

  root.append(box, widthLabel, heightLabel);
  root.style.display = "none";
  document.documentElement.append(root);

  const setRect = (rect: DOMRect) => {
    root.style.left = `${rect.left}px`;
    root.style.top = `${rect.top}px`;
    root.style.width = `${rect.width}px`;
    root.style.height = `${rect.height}px`;
    widthLabel.textContent = `${Math.round(rect.width)}`;
    heightLabel.textContent = `${Math.round(rect.height)}`;
  };

  return {
    root,
    setRect,
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
