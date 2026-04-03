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

  const lineLeft = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const lineRight = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const lineTop = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const lineBottom = document.createElementNS("http://www.w3.org/2000/svg", "line");

  svg.append(lineLeft, lineRight, lineTop, lineBottom);
  return { svg, lineLeft, lineRight, lineTop, lineBottom };
};

const getDocumentDimensions = () => {
  const body = document.body;
  const doc = document.documentElement;

  return {
    width: Math.max(
      window.innerWidth,
      body?.scrollWidth ?? 0,
      body?.offsetWidth ?? 0,
      doc?.scrollWidth ?? 0,
      doc?.offsetWidth ?? 0,
      doc?.clientWidth ?? 0
    ),
    height: Math.max(
      window.innerHeight,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
      doc?.scrollHeight ?? 0,
      doc?.offsetHeight ?? 0,
      doc?.clientHeight ?? 0
    ),
  };
};

export const createGridlines = (mountParent?: HTMLElement): GridlinesHandle => {
  const root = document.createElement("div");
  root.className = "wilderness-gridlines";

  const { svg, lineLeft, lineRight, lineTop, lineBottom } = createSvg();
  root.append(svg);
  root.style.display = "none";
  const parent = mountParent ?? document.documentElement ?? document.body;
  if (!parent) {
    console.warn("[Guides] Unable to mount gridlines: no document root.");
  } else {
    parent.append(root);
  }

  const update = (rect: DOMRect) => {
    const dimensions = getDocumentDimensions();

    svg.setAttribute("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);
    svg.setAttribute("width", `${dimensions.width}`);
    svg.setAttribute("height", `${dimensions.height}`);

    const left = rect.left;
    const right = rect.left + rect.width;
    const top = rect.top;
    const bottom = rect.top + rect.height;

    lineLeft.setAttribute("x1", `${left}`);
    lineLeft.setAttribute("x2", `${left}`);
    lineLeft.setAttribute("y1", "0");
    lineLeft.setAttribute("y2", `${dimensions.height}`);

    lineRight.setAttribute("x1", `${right}`);
    lineRight.setAttribute("x2", `${right}`);
    lineRight.setAttribute("y1", "0");
    lineRight.setAttribute("y2", `${dimensions.height}`);

    lineTop.setAttribute("x1", "0");
    lineTop.setAttribute("x2", `${dimensions.width}`);
    lineTop.setAttribute("y1", `${top}`);
    lineTop.setAttribute("y2", `${top}`);

    lineBottom.setAttribute("x1", "0");
    lineBottom.setAttribute("x2", `${dimensions.width}`);
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
