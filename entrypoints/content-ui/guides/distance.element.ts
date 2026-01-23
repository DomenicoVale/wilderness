type DistanceHandle = {
  root: HTMLDivElement;
  setPosition: (position: DistancePosition) => void;
  remove: () => void;
};

export type DistancePosition = {
  orientation: "horizontal" | "vertical";
  distance: number;
  x: number;
  y: number;
  length: number;
};

export const createDistance = (): DistanceHandle => {
  const root = document.createElement("div");
  root.className = "wilderness-distance";

  const line = document.createElement("div");
  line.className = "wilderness-distance__line";

  const label = document.createElement("div");
  label.className = "wilderness-distance__label";

  root.append(line, label);
  document.documentElement.append(root);

  const setPosition = ({
    orientation,
    distance,
    x,
    y,
    length,
  }: DistancePosition) => {
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

  return {
    root,
    setPosition,
    remove: () => {
      root.remove();
    },
  };
};
