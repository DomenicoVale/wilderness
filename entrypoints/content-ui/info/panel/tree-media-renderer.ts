import $ from "jquery";
import type { MediaItem } from "../core/types";
import { scheduleTreeExpansionPersist } from "../state/persistence";
import { buildSelectorForElement } from "../utils/common";
import { getElementTreePath, getTreeChildren, getTreeLabel } from "../utils/dom-tree";
import { findClosestMediaMatch, getMediaRelationLabel, getMediaRenderElement } from "../utils/media";

type CreateTreeMediaRendererOptions = {
  treeList: HTMLDivElement;
  mediaList: HTMLDivElement;
  getCurrentTreeTarget: () => Element | null;
  getOnTreeSelect: () => ((element: Element) => void) | null;
  getOnPreviewHover: () => ((element: Element | null) => void) | null;
  treeExpansionState: Map<string, boolean>;
};

export type TreeMediaRenderer = {
  ensureSelectedTreePathExpanded: (selected: Element) => void;
  renderTreeListInPlace: (preserveScroll: boolean) => void;
  renderMediaList: (target: Element) => void;
};

export const createTreeMediaRenderer = ({
  treeList,
  mediaList,
  getCurrentTreeTarget,
  getOnTreeSelect,
  getOnPreviewHover,
  treeExpansionState,
}: CreateTreeMediaRendererOptions): TreeMediaRenderer => {
  const TREE_NODE_RENDER_LIMIT = 10000;

  const centerActiveTreeItem = () => {
    const activeItem = treeList.querySelector<HTMLElement>(".wilderness-inspect-tree__item[data-active='true']");
    if (!activeItem) {
      return;
    }

    const listRect = treeList.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    treeList.scrollTop += itemRect.top - listRect.top - (listRect.height / 2 - itemRect.height / 2);
    treeList.scrollLeft += itemRect.left - listRect.left - (listRect.width / 2 - itemRect.width / 2);
  };

  const renderTreeListInPlace = (preserveScroll: boolean) => {
    const selected = getCurrentTreeTarget();
    if (!selected) {
      return;
    }

    const scrollTop = treeList.scrollTop;
    const scrollLeft = treeList.scrollLeft;
    treeList.innerHTML = "";

    const renderNode = (node: Element, depth: number, count: { n: number }) => {
      if (count.n >= TREE_NODE_RENDER_LIMIT) {
        return;
      }
      count.n += 1;
      const children = getTreeChildren(node);
      const hasChildren = children.length > 0;
      const key = buildSelectorForElement(node);
      const expanded = node === selected ? true : (treeExpansionState.get(key) ?? true);
      if (hasChildren) {
        treeExpansionState.set(key, expanded);
      }

      const row = document.createElement("div");
      row.className = "wilderness-inspect-tree__row";
      row.style.paddingLeft = `${depth * 14 + 6}px`;

      const twisty = document.createElement("button");
      twisty.type = "button";
      twisty.className = "wilderness-inspect-tree__twisty";
      if (hasChildren) {
        twisty.textContent = expanded ? "▾" : "▸";
        twisty.setAttribute("aria-label", expanded ? "Collapse tree node" : "Expand tree node");
        twisty.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          treeExpansionState.set(key, !expanded);
          scheduleTreeExpansionPersist(treeExpansionState);
          renderTreeListInPlace(true);
        });
      } else {
        twisty.textContent = " ";
        twisty.disabled = true;
        twisty.setAttribute("data-empty", "true");
      }

      const treeButton = document.createElement("button");
      treeButton.type = "button";
      treeButton.className = "wilderness-inspect-tree__item";
      const nodeLabel = getTreeLabel(node);
      treeButton.textContent = nodeLabel.length > 220 ? `${nodeLabel.slice(0, 220)}…` : nodeLabel;
      if (node === selected) {
        treeButton.setAttribute("data-active", "true");
      }
      treeButton.addEventListener("click", () => {
        getOnTreeSelect()?.(node);
      });
      treeButton.addEventListener("mouseenter", () => {
        getOnPreviewHover()?.(node);
      });
      treeButton.addEventListener("mouseleave", () => {
        getOnPreviewHover()?.(null);
      });

      row.append(twisty, treeButton);
      treeList.append(row);

      if (hasChildren && expanded) {
        children.forEach((child) => renderNode(child, depth + 1, count));
      }
    };

    const treeRoot = document.body ?? document.documentElement;
    renderNode(treeRoot, 0, { n: 0 });

    if (preserveScroll) {
      treeList.scrollTop = scrollTop;
      treeList.scrollLeft = scrollLeft;
    } else {
      centerActiveTreeItem();
    }
  };

  const ensureSelectedTreePathExpanded = (selected: Element) => {
    const path = getElementTreePath(selected);
    path.forEach((node) => {
      if (node instanceof Element) {
        treeExpansionState.set(buildSelectorForElement(node), true);
      }
    });
    scheduleTreeExpansionPersist(treeExpansionState);
  };

  const renderMediaMetadata = (container: HTMLElement, item: MediaItem) => {
    const rows: Array<[string, string]> = [
      ["kind", item.kind],
      ["mime", item.mimeType || "-"],
      ["iRes", item.intrinsic ? `${item.intrinsic.width}x${item.intrinsic.height}` : "-"],
      ["Res", `${item.rendered.width}x${item.rendered.height}`],
      ["url", item.url || "(inline)"],
    ];
    rows.forEach(([label, value]) => {
      const row = $('<div class="wilderness-inspect-media__meta-row" />')
        .append($('<span class="wilderness-inspect-media__meta-label" />').text(`${label}:`))
        .append($('<span class="wilderness-inspect-media__meta-value" />').text(value));
      $(container).append(row);
    });
  };

  const renderMediaList = (target: Element) => {
    const mediaMatch = findClosestMediaMatch(target);
    if (!mediaMatch) {
      $(mediaList).append('<div class="wilderness-inspect-media__empty">No media found.</div>');
      return;
    }

    if (mediaMatch.relation !== "selected") {
      $(mediaList).append($('<div class="wilderness-inspect-media__hint" />').text(getMediaRelationLabel(mediaMatch.relation)));
    }

    mediaMatch.items.forEach((item) => {
      const entry = document.createElement("div");
      entry.className = "wilderness-inspect-media__item";

      entry.addEventListener("mouseenter", () => {
        getOnPreviewHover()?.(item.element);
      });
      entry.addEventListener("mouseleave", () => {
        getOnPreviewHover()?.(null);
      });

      const preview = document.createElement(item.url ? "a" : "div");
      preview.className = "wilderness-inspect-media__preview";
      if (item.url && preview instanceof HTMLAnchorElement) {
        preview.href = item.url;
        preview.target = "_blank";
        preview.rel = "noopener noreferrer";
      }
      const isImagePreviewable =
        item.kind === "image" || item.kind === "picture" || item.kind === "background" || item.kind === "svg";
      if (isImagePreviewable && item.url) {
        const image = document.createElement("img");
        image.className = "wilderness-inspect-media__img";
        image.src = item.url;
        image.alt = `${item.kind} preview`;
        image.loading = "lazy";
        preview.append(image);
      } else {
        preview.textContent = item.kind.toUpperCase();
        preview.classList.add("wilderness-inspect-media__preview--text");
      }

      const info = document.createElement("div");
      info.className = "wilderness-inspect-media__meta";
      renderMediaMetadata(info, item);
      const selectMediaButton = document.createElement("button");
      selectMediaButton.type = "button";
      selectMediaButton.className = "wilderness-inspect-media__jump";
      selectMediaButton.textContent = "[SELECT]";
      selectMediaButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        getOnTreeSelect()?.(getMediaRenderElement(item.element));
      });
      info.append(selectMediaButton);

      entry.append(preview, info);
      mediaList.append(entry);
    });
  };

  return {
    ensureSelectedTreePathExpanded,
    renderTreeListInPlace,
    renderMediaList,
  };
};
