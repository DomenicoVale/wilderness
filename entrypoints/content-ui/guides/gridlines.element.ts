type GridlinesHandle = {
  root: HTMLDivElement;
  update: (rect: DOMRect) => void;
  show: () => void;
  hide: () => void;
  remove: () => void;
};

const createSvg = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("wilderness-gridlines__svg");

  const lineLeft = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line",
  );
  const lineRight = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line",
  );
  const lineTop = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line",
  );
  const lineBottom = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line",
  );

  svg.append(lineLeft, lineRight, lineTop, lineBottom);
  return { svg, lineLeft, lineRight, lineTop, lineBottom };
};

export const createGridlines = (): GridlinesHandle => {
  const root = document.createElement("div");
  root.className = "wilderness-gridlines";

  const { svg, lineLeft, lineRight, lineTop, lineBottom } = createSvg();
  root.append(svg);
  root.style.display = "none";
  document.documentElement.append(root);

  const update = (rect: DOMRect) => {
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    svg.setAttribute("viewBox", `0 0 ${winWidth} ${winHeight}`);
    svg.setAttribute("width", `${winWidth}`);
    svg.setAttribute("height", `${winHeight}`);

    const left = rect.left;
    const right = rect.left + rect.width;
    const top = rect.top;
    const bottom = rect.top + rect.height;

    lineLeft.setAttribute("x1", `${left}`);
    lineLeft.setAttribute("x2", `${left}`);
    lineLeft.setAttribute("y1", "0");
    lineLeft.setAttribute("y2", `${winHeight}`);

    lineRight.setAttribute("x1", `${right}`);
    lineRight.setAttribute("x2", `${right}`);
    lineRight.setAttribute("y1", "0");
    lineRight.setAttribute("y2", `${winHeight}`);

    lineTop.setAttribute("x1", "0");
    lineTop.setAttribute("x2", `${winWidth}`);
    lineTop.setAttribute("y1", `${top}`);
    lineTop.setAttribute("y2", `${top}`);

    lineBottom.setAttribute("x1", "0");
    lineBottom.setAttribute("x2", `${winWidth}`);
    lineBottom.setAttribute("y1", `${bottom}`);
    lineBottom.setAttribute("y2", `${bottom}`);
  };

  return {
    root,
    update,
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
