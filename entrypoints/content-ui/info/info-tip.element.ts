import type { StyleEntry } from "./info-utils";

type InfoTipHandle = {
  root: HTMLDivElement;
  setContent: (payload: InfoTipContent) => void;
  setPosition: (x: number, y: number) => void;
  setPinned: (pinned: boolean) => void;
  show: () => void;
  hide: () => void;
  remove: () => void;
};

export type InfoTipContent = {
  element: Element;
  width: number;
  height: number;
  styles: StyleEntry[];
};

const formatTagLabel = (el: Element) => {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = el.classList.length
    ? `.${Array.from(el.classList).join(".")}`
    : "";

  return { tag, id, classes };
};

const buildStyleRow = (entry: StyleEntry) => {
  const row = document.createElement("div");
  row.className = "wilderness-info-tip__row";
  if (entry.isInline) {
    row.setAttribute("data-inline", "true");
  }
  if (entry.swatch) {
    row.setAttribute("data-has-swatch", "true");
  }

  const prop = document.createElement("span");
  prop.className = "wilderness-info-tip__prop";
  prop.textContent = entry.prop;

  const value = document.createElement("span");
  value.className = "wilderness-info-tip__value";
  value.textContent = entry.value;

  row.append(prop, value);

  if (entry.swatch) {
    const swatch = document.createElement("span");
    swatch.className = "wilderness-info-tip__swatch";
    swatch.style.background = entry.swatch;
    row.prepend(swatch);
  }

  return row;
};

export const createInfoTip = (): InfoTipHandle => {
  const root = document.createElement("div");
  root.className = "wilderness-info-tip";
  root.setAttribute("data-pinned", "false");

  const card = document.createElement("div");
  card.className = "wilderness-info-tip__card";

  const header = document.createElement("header");
  header.className = "wilderness-info-tip__header";

  const title = document.createElement("div");
  title.className = "wilderness-info-tip__title";

  const size = document.createElement("div");
  size.className = "wilderness-info-tip__size";

  header.append(title, size);

  const list = document.createElement("div");
  list.className = "wilderness-info-tip__list";

  card.append(header, list);
  root.append(card);

  root.style.display = "none";
  const parent = document.body ?? document.documentElement;
  if (!parent) {
    console.warn("[Info] Unable to mount info tip: no document root.");
  } else {
    parent.append(root);
  }

  let dragState: {
    offsetX: number;
    offsetY: number;
  } | null = null;

  const cleanupDrag = () => {
    dragState = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragState) {
      return;
    }

    root.style.left = `${event.clientX - dragState.offsetX}px`;
    root.style.top = `${event.clientY - dragState.offsetY}px`;
  };

  const handlePointerUp = () => {
    cleanupDrag();
  };

  header.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const rect = root.getBoundingClientRect();
    dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.preventDefault();
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  });

  return {
    root,
    setContent: ({ element, width, height, styles }) => {
      const { tag, id, classes } = formatTagLabel(element);
      title.textContent = `${tag}${id}${classes}`;
      size.textContent = `${Math.round(width)} × ${Math.round(height)}`;

      list.innerHTML = "";
      if (!styles.length) {
        const empty = document.createElement("div");
        empty.className = "wilderness-info-tip__empty";
        empty.textContent = "No notable styles.";
        list.append(empty);
        return;
      }

      styles.forEach((entry) => {
        list.append(buildStyleRow(entry));
      });
    },
    setPosition: (x: number, y: number) => {
      root.style.left = `${x}px`;
      root.style.top = `${y}px`;
    },
    setPinned: (pinned: boolean) => {
      root.setAttribute("data-pinned", pinned ? "true" : "false");
    },
    show: () => {
      root.style.display = "block";
    },
    hide: () => {
      root.style.display = "none";
    },
    remove: () => {
      cleanupDrag();
      root.remove();
    },
  };
};
