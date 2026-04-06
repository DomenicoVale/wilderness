import { createTreeMediaRenderer as createBaseTreeMediaRenderer } from "./tree-media-renderer";

type CreateTreeMediaRendererOptions = {
  treeList: HTMLDivElement;
  mediaList: HTMLDivElement;
  treeExpansionState: Map<string, boolean>;
  treeNodeRenderLimit: number;
  getCurrentTreeTarget: () => Element | null;
  setCurrentTreeTarget: (target: Element | null) => void;
  getOnTreeSelect: () => ((element: Element) => void) | null;
  getOnPreviewHover: () => ((element: Element | null) => void) | null;
};

export type TreeMediaRenderer = {
  ensureSelectedTreePathExpanded: (selected: Element) => void;
  renderTreeListInPlace: (preserveScroll: boolean) => void;
  renderMediaListForTarget: (target: Element) => void;
  clearMediaList: () => void;
};

export const createTreeMediaRenderer = ({
  treeList,
  mediaList,
  treeExpansionState,
  treeNodeRenderLimit: _treeNodeRenderLimit,
  getCurrentTreeTarget,
  setCurrentTreeTarget,
  getOnTreeSelect,
  getOnPreviewHover,
}: CreateTreeMediaRendererOptions): TreeMediaRenderer => {
  const baseRenderer = createBaseTreeMediaRenderer({
    treeList,
    mediaList,
    treeExpansionState,
    getCurrentTreeTarget,
    getOnPreviewHover,
    getOnTreeSelect: () => {
      const onTreeSelect = getOnTreeSelect();
      if (!onTreeSelect) {
        return null;
      }
      return (element: Element) => {
        setCurrentTreeTarget(element);
        onTreeSelect(element);
      };
    },
  });

  const clearMediaList = () => {
    mediaList.innerHTML = "";
  };

  return {
    ensureSelectedTreePathExpanded: baseRenderer.ensureSelectedTreePathExpanded,
    renderTreeListInPlace: baseRenderer.renderTreeListInPlace,
    renderMediaListForTarget: (target) => {
      clearMediaList();
      baseRenderer.renderMediaList(target);
    },
    clearMediaList,
  };
};
