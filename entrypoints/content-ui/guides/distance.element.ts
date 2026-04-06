import $ from "jquery";

export type DistanceHandle = {
  root: HTMLDivElement;
  setPosition: (position: DistancePosition) => void;
  setColor: (color: string) => void;
  setVisible: (v: boolean) => void;
  remove: () => void;
};

export type DistancePosition = {
  orientation: "horizontal" | "vertical";
  distance: number;
  x: number;
  y: number;
  length: number;
};

export const createDistance = (mountParent?: HTMLElement): DistanceHandle => {
  const root = $("<div>").addClass("wilderness-distance").get(0);
  const line = $("<div>").addClass("wilderness-distance__line").get(0);
  const label = $("<div>").addClass("wilderness-distance__label").get(0);
  if (!(root instanceof HTMLDivElement) || !(line instanceof HTMLDivElement) || !(label instanceof HTMLDivElement)) {
    throw new Error("[Guides] Unable to create distance overlay nodes.");
  }

  $(root).append(line, label);
  const parent = mountParent ?? document.documentElement ?? document.body;
  if (!parent) {
    console.warn("[Guides] Unable to mount distance: no document root.");
  } else {
    $(parent).append(root);
  }

  const setPosition = ({ orientation, distance, x, y, length }: DistancePosition) => {
    root.style.left = `${x}px`;
    root.style.top = `${y}px`;
    label.textContent = `${Math.round(distance)}`;

    if (orientation === "vertical") {
      line.style.width = "2px";
      line.style.height = `${length}px`;
      label.style.left = "12px";
      label.style.top = `${length / 2}px`;
      return;
    }

    line.style.height = "2px";
    line.style.width = `${length}px`;
    label.style.left = `${length / 2}px`;
    label.style.top = "-12px";
  };

  const setColor = (color: string) => {
    $(line).css("background", color);
    $(label).css("background", color);
  };

  const setVisible = (v: boolean) => {
    $(root).toggle(v);
  };

  return {
    root,
    setPosition,
    setColor,
    setVisible,
    remove: () => {
      root.remove();
    },
  };
};
