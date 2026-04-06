import $ from "jquery";

type GridlinesHandle = {
  root: HTMLDivElement;
  update: (rect: DOMRect) => void;
  show: () => void;
  hide: () => void;
  remove: () => void;
};

const createSvg = () => {
  const svg = $(document.createElementNS("http://www.w3.org/2000/svg", "svg")).addClass("wilderness-gridlines__svg").get(0);
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error("[Guides] Unable to create gridlines SVG.");
  }

  const lineLeft = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const lineRight = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const lineTop = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const lineBottom = document.createElementNS("http://www.w3.org/2000/svg", "line");

  $(svg).append(lineLeft, lineRight, lineTop, lineBottom);
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
  const root = $("<div>").addClass("wilderness-gridlines").get(0);
  if (!(root instanceof HTMLDivElement)) {
    throw new Error("[Guides] Unable to create gridlines root.");
  }

  const { svg, lineLeft, lineRight, lineTop, lineBottom } = createSvg();
  $(root).append(svg).hide();
  const parent = mountParent ?? document.documentElement ?? document.body;
  if (!parent) {
    console.warn("[Guides] Unable to mount gridlines: no document root.");
  } else {
    $(parent).append(root);
  }

  const update = (rect: DOMRect) => {
    const dimensions = getDocumentDimensions();

    $(svg).attr({
      viewBox: `0 0 ${dimensions.width} ${dimensions.height}`,
      width: `${dimensions.width}`,
      height: `${dimensions.height}`,
    });

    const left = rect.left;
    const right = rect.left + rect.width;
    const top = rect.top;
    const bottom = rect.top + rect.height;

    $(lineLeft).attr({
      x1: `${left}`,
      x2: `${left}`,
      y1: "0",
      y2: `${dimensions.height}`,
    });

    $(lineRight).attr({
      x1: `${right}`,
      x2: `${right}`,
      y1: "0",
      y2: `${dimensions.height}`,
    });

    $(lineTop).attr({
      x1: "0",
      x2: `${dimensions.width}`,
      y1: `${top}`,
      y2: `${top}`,
    });

    $(lineBottom).attr({
      x1: "0",
      x2: `${dimensions.width}`,
      y1: `${bottom}`,
      y2: `${bottom}`,
    });
  };

  return {
    root,
    update,
    show: () => {
      $(root).show();
    },
    hide: () => {
      $(root).hide();
    },
    remove: () => {
      root.remove();
    },
  };
};
