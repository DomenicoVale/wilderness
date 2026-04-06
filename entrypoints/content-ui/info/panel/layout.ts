import $ from "jquery";
import {
  DEFAULT_LEFT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT_RATIO,
  DEFAULT_RIGHT_PANEL_WIDTH,
  hydratePanelLayoutState,
  loadPanelLayoutState,
  MAX_LEFT_PANEL_WIDTH,
  MAX_RIGHT_PANEL_WIDTH,
  MIN_LEFT_PANEL_HEIGHT,
  MIN_LEFT_PANEL_WIDTH,
  MIN_RIGHT_PANEL_HEIGHT,
  MIN_RIGHT_PANEL_WIDTH,
  PANEL_VIEWPORT_GAP,
  savePanelLayoutState,
} from "../state/persistence";

type CreatePanelLayoutControllerOptions = {
  root: HTMLDivElement;
  leftPanel: HTMLDivElement;
  headerTop: HTMLDivElement;
  leftHeader: HTMLDivElement;
  collapsedWrap: HTMLDivElement;
  leftCollapsedWrap: HTMLDivElement;
  updateMediaLayoutMode: () => void;
  hideVariablePopover: () => void;
  isDestroyed: () => boolean;
};

const isTargetWithin = (target: EventTarget | null, selector: string) =>
  target instanceof Element && $(target).closest(selector).length > 0;

export type PanelLayoutController = {
  setCollapsed: (next: boolean) => void;
  setLeftCollapsed: (next: boolean) => void;
  setRightPanelPosition: (nextLeft: number, nextTop: number) => void;
  setLeftPanelPosition: (nextLeft: number, nextTop: number) => void;
  writeLayoutState: () => void;
  arePanelsVisible: () => boolean;
  applySavedLayout: () => void;
  hydrateAndApplySavedLayout: () => Promise<void>;
  destroy: () => void;
};

const consumePanelInteractions = (panel: HTMLElement, isDestroyed: () => boolean) => {
  const stopPropagation = (event: Event) => {
    if (isDestroyed()) {
      return;
    }
    event.stopPropagation();
  };
  [
    "pointerdown",
    "pointerup",
    "pointercancel",
    "mousedown",
    "mouseup",
    "click",
    "dblclick",
    "contextmenu",
    "mouseenter",
    "mouseleave",
    "mouseover",
    "mouseout",
  ].forEach((eventName) => panel.addEventListener(eventName, stopPropagation));
};

const consumeWheelInsidePanel = (panel: HTMLElement) => {
  panel.addEventListener(
    "wheel",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const nearestScrollable = target?.closest(
        ".wilderness-inspect-tree, .wilderness-inspect-media, .wilderness-inspect-props-list, .wilderness-inspect-panel__content, .wilderness-inspect-left__content"
      ) as HTMLElement | null;
      const fallbackScroller = panel.querySelector<HTMLElement>(
        ".wilderness-inspect-panel__content, .wilderness-inspect-left__content"
      );
      const scroller = nearestScrollable ?? fallbackScroller;
      if (!scroller || !target || !panel.contains(target)) {
        return;
      }
      const isHorizontal = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const before = isHorizontal ? scroller.scrollLeft : scroller.scrollTop;
      const delta = isHorizontal ? event.deltaX || event.deltaY : event.deltaY;
      if (isHorizontal) {
        scroller.scrollLeft += delta;
      } else {
        scroller.scrollTop += delta;
      }
      const didScroll = (isHorizontal ? scroller.scrollLeft : scroller.scrollTop) !== before;
      event.preventDefault();
      if (didScroll) {
        event.stopPropagation();
      }
    },
    { passive: false, capture: true }
  );
};

export const createPanelLayoutController = ({
  root,
  leftPanel,
  headerTop,
  leftHeader,
  collapsedWrap,
  leftCollapsedWrap,
  updateMediaLayoutMode,
  hideVariablePopover,
  isDestroyed,
}: CreatePanelLayoutControllerOptions): PanelLayoutController => {
  const viewportGap = 16;
  const defaultPanelHeight = () => Math.max(MIN_RIGHT_PANEL_HEIGHT, Math.round(window.innerHeight * DEFAULT_PANEL_HEIGHT_RATIO));

  let rightDragPointerId: number | null = null;
  let rightDragOffsetX = 0;
  let rightDragOffsetY = 0;
  let leftDragPointerId: number | null = null;
  let leftDragOffsetX = 0;
  let leftDragOffsetY = 0;
  let suppressLayoutPersist = false;
  let expandedLeftSize = { width: DEFAULT_LEFT_PANEL_WIDTH, height: defaultPanelHeight() };
  let expandedRightSize = { width: DEFAULT_RIGHT_PANEL_WIDTH, height: defaultPanelHeight() };

  const arePanelsVisible = () => root.style.display !== "none" && leftPanel.style.display !== "none";

  const writeLayoutState = () => {
    if (isDestroyed() || !root.isConnected || !leftPanel.isConnected || !arePanelsVisible()) {
      return;
    }
    const rightRect = root.getBoundingClientRect();
    const leftRect = leftPanel.getBoundingClientRect();
    savePanelLayoutState({
      right: {
        left: rightRect.left,
        top: rightRect.top,
        width: rightRect.width,
        height: rightRect.height,
        collapsed: root.getAttribute("data-collapsed") === "true",
      },
      left: {
        left: leftRect.left,
        top: leftRect.top,
        width: leftRect.width,
        height: leftRect.height,
        collapsed: leftPanel.getAttribute("data-collapsed") === "true",
      },
    });
  };

  const clampPanelPosition = (panel: HTMLDivElement, nextLeft: number, nextTop: number) => {
    if (isDestroyed()) {
      return;
    }
    const maxLeft = Math.max(PANEL_VIEWPORT_GAP, window.innerWidth - panel.offsetWidth - PANEL_VIEWPORT_GAP);
    const maxTop = Math.max(PANEL_VIEWPORT_GAP, window.innerHeight - panel.offsetHeight - PANEL_VIEWPORT_GAP);
    const left = Math.min(Math.max(PANEL_VIEWPORT_GAP, nextLeft), maxLeft);
    const top = Math.min(Math.max(PANEL_VIEWPORT_GAP, nextTop), maxTop);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
  };

  const setPanelPositionByRect = (panel: HTMLDivElement, nextLeft: number, nextTop: number) => {
    if (isDestroyed()) {
      return;
    }
    clampPanelPosition(panel, nextLeft, nextTop);
    if (!suppressLayoutPersist) {
      writeLayoutState();
    }
  };

  const setRightPanelPosition = (nextLeft: number, nextTop: number) => setPanelPositionByRect(root, nextLeft, nextTop);
  const setLeftPanelPosition = (nextLeft: number, nextTop: number) => setPanelPositionByRect(leftPanel, nextLeft, nextTop);

  const getPanelMinWidth = (panel: HTMLDivElement) => (panel === leftPanel ? MIN_LEFT_PANEL_WIDTH : MIN_RIGHT_PANEL_WIDTH);
  const getPanelMinHeight = (panel: HTMLDivElement) => (panel === leftPanel ? MIN_LEFT_PANEL_HEIGHT : MIN_RIGHT_PANEL_HEIGHT);

  const clampPanelSize = (panel: HTMLDivElement, width: number, height: number) => {
    const maxWidth = Math.max(getPanelMinWidth(panel), window.innerWidth - PANEL_VIEWPORT_GAP * 2);
    const maxHeight = Math.max(getPanelMinHeight(panel), window.innerHeight - PANEL_VIEWPORT_GAP * 2);
    return {
      width: Math.min(Math.max(getPanelMinWidth(panel), Math.round(width)), maxWidth),
      height: Math.min(Math.max(getPanelMinHeight(panel), Math.round(height)), maxHeight),
    };
  };

  const isPanelCollapsed = (panel: HTMLDivElement) => panel.getAttribute("data-collapsed") === "true";

  const setPanelSize = (panel: HTMLDivElement, width: number, height: number) => {
    if (isDestroyed()) {
      return;
    }
    const next = clampPanelSize(panel, width, height);
    if (panel === leftPanel) {
      expandedLeftSize = next;
    } else {
      expandedRightSize = next;
    }
    if (isPanelCollapsed(panel)) {
      panel.style.width = "";
      panel.style.height = "";
      return;
    }
    panel.style.width = `${next.width}px`;
    panel.style.height = `${next.height}px`;
    if (panel === leftPanel) {
      updateMediaLayoutMode();
    }
  };

  const setCollapsed = (next: boolean) => {
    if (isDestroyed()) {
      return;
    }
    const wasCollapsed = root.getAttribute("data-collapsed") === "true";
    if (next === wasCollapsed) {
      if (root.style.left && root.style.top) {
        const rect = root.getBoundingClientRect();
        setRightPanelPosition(rect.left, rect.top);
      }
      if (!suppressLayoutPersist) {
        writeLayoutState();
      }
      return;
    }

    if (next) {
      const rect = root.getBoundingClientRect();
      const rightEdge = rect.left + rect.width;
      expandedRightSize = clampPanelSize(root, rect.width, rect.height);
      root.setAttribute("data-collapsed", "true");
      root.style.width = "";
      root.style.height = "";
      const collapsedRect = root.getBoundingClientRect();
      setRightPanelPosition(rightEdge - collapsedRect.width, rect.top);
    } else {
      const rect = root.getBoundingClientRect();
      const rightEdge = rect.left + rect.width;
      root.setAttribute("data-collapsed", "false");
      setPanelSize(root, expandedRightSize.width, expandedRightSize.height);
      const expandedRect = root.getBoundingClientRect();
      setRightPanelPosition(rightEdge - expandedRect.width, rect.top);
    }
    if (!suppressLayoutPersist) {
      writeLayoutState();
    }
  };

  const setLeftCollapsed = (next: boolean) => {
    if (isDestroyed()) {
      return;
    }
    const wasCollapsed = leftPanel.getAttribute("data-collapsed") === "true";
    if (next === wasCollapsed) {
      if (leftPanel.style.left && leftPanel.style.top) {
        const rect = leftPanel.getBoundingClientRect();
        setLeftPanelPosition(rect.left, rect.top);
      }
      if (!suppressLayoutPersist) {
        writeLayoutState();
      }
      return;
    }

    if (next) {
      const rect = leftPanel.getBoundingClientRect();
      expandedLeftSize = clampPanelSize(leftPanel, rect.width, rect.height);
      leftPanel.setAttribute("data-collapsed", "true");
      leftPanel.style.width = "";
      leftPanel.style.height = "";
    } else {
      leftPanel.setAttribute("data-collapsed", "false");
      setPanelSize(leftPanel, expandedLeftSize.width, expandedLeftSize.height);
    }

    if (leftPanel.style.left && leftPanel.style.top) {
      const rect = leftPanel.getBoundingClientRect();
      setLeftPanelPosition(rect.left, rect.top);
    }
    if (!suppressLayoutPersist) {
      writeLayoutState();
    }
  };

  const clearRightPanelDrag = (event?: PointerEvent) => {
    if (rightDragPointerId === null) {
      return;
    }
    if (event && event.pointerId !== rightDragPointerId) {
      return;
    }

    if (headerTop.hasPointerCapture(rightDragPointerId)) {
      headerTop.releasePointerCapture(rightDragPointerId);
    }
    rightDragPointerId = null;
  };

  const clearLeftPanelDrag = (event?: PointerEvent) => {
    if (leftDragPointerId === null) {
      return;
    }
    if (event && event.pointerId !== leftDragPointerId) {
      return;
    }

    if (leftHeader.hasPointerCapture(leftDragPointerId)) {
      leftHeader.releasePointerCapture(leftDragPointerId);
    }
    leftDragPointerId = null;
  };

  const startPanelResize = (panel: HTMLDivElement, event: PointerEvent, edge: string) => {
    if (isDestroyed() || isPanelCollapsed(panel)) {
      return;
    }
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = panel.getBoundingClientRect();
    const edgeSet = new Set(edge.split("-"));
    const maxWidth = Math.max(getPanelMinWidth(panel), window.innerWidth - PANEL_VIEWPORT_GAP * 2);
    const maxHeight = Math.max(getPanelMinHeight(panel), window.innerHeight - PANEL_VIEWPORT_GAP * 2);
    panel.setPointerCapture(pointerId);
    event.preventDefault();
    event.stopPropagation();

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      let width = startRect.width;
      let height = startRect.height;
      let left = startRect.left;
      let top = startRect.top;

      if (edgeSet.has("left")) {
        width = Math.min(Math.max(getPanelMinWidth(panel), startRect.width - dx), maxWidth);
        left = startRect.right - width;
      } else if (edgeSet.has("right")) {
        width = Math.min(Math.max(getPanelMinWidth(panel), startRect.width + dx), maxWidth);
      }

      if (edgeSet.has("top")) {
        height = Math.min(Math.max(getPanelMinHeight(panel), startRect.height - dy), maxHeight);
        top = startRect.bottom - height;
      } else if (edgeSet.has("bottom")) {
        height = Math.min(Math.max(getPanelMinHeight(panel), startRect.height + dy), maxHeight);
      }

      setPanelSize(panel, width, height);
      setPanelPositionByRect(panel, left, top);
    };

    const onPointerEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) {
        return;
      }
      if (panel.hasPointerCapture(pointerId)) {
        panel.releasePointerCapture(pointerId);
      }
      panel.removeEventListener("lostpointercapture", onPointerEnd);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd, true);
      window.removeEventListener("pointercancel", onPointerEnd, true);
      writeLayoutState();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd, true);
    window.addEventListener("pointercancel", onPointerEnd, true);
    panel.addEventListener("lostpointercapture", onPointerEnd);
  };

  const addResizeHandles = (panel: HTMLDivElement, className: string) => {
    const edges = ["top", "right", "bottom", "left", "top-left", "top-right", "bottom-right", "bottom-left"];
    edges.forEach((edge) => {
      const handle = document.createElement("div");
      handle.className = className;
      handle.setAttribute("data-edge", edge);
      handle.addEventListener("pointerdown", (event) => {
        if (!(event instanceof PointerEvent) || event.button !== 0) {
          return;
        }
        startPanelResize(panel, event, edge);
      });
      panel.append(handle);
    });
  };

  const clampPanelToViewport = (panel: HTMLDivElement) => {
    if (isDestroyed()) {
      return;
    }
    if (isPanelCollapsed(panel)) {
      const next =
        panel === leftPanel
          ? clampPanelSize(panel, expandedLeftSize.width, expandedLeftSize.height)
          : clampPanelSize(panel, expandedRightSize.width, expandedRightSize.height);
      if (panel === leftPanel) {
        expandedLeftSize = next;
      } else {
        expandedRightSize = next;
      }
      const rect = panel.getBoundingClientRect();
      setPanelPositionByRect(panel, rect.left, rect.top);
      if (panel === leftPanel) {
        updateMediaLayoutMode();
      }
      return;
    }
    const rect = panel.getBoundingClientRect();
    setPanelSize(panel, rect.width, rect.height);
    const nextRect = panel.getBoundingClientRect();
    setPanelPositionByRect(panel, nextRect.left, nextRect.top);
  };

  const ensureDefaultDockSides = () => {
    const leftRect = leftPanel.getBoundingClientRect();
    const rightRect = root.getBoundingClientRect();
    const overlaps =
      leftRect.left < rightRect.right &&
      leftRect.right > rightRect.left &&
      leftRect.top < rightRect.bottom &&
      leftRect.bottom > rightRect.top;
    if (!overlaps) {
      return;
    }

    const preferredRightLeft = Math.max(
      PANEL_VIEWPORT_GAP,
      Math.min(window.innerWidth - rightRect.width - PANEL_VIEWPORT_GAP, window.innerWidth - rightRect.width - viewportGap / 2)
    );
    if (preferredRightLeft <= leftRect.right + PANEL_VIEWPORT_GAP) {
      return;
    }
    setRightPanelPosition(preferredRightLeft, rightRect.top);
  };

  const applyDefaultPanelLayout = () => {
    if (isDestroyed()) {
      return;
    }
    suppressLayoutPersist = true;
    const safeHeight = defaultPanelHeight();
    const leftWidth = Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(DEFAULT_LEFT_PANEL_WIDTH, 26 * 16));
    const rightWidth = Math.min(MAX_RIGHT_PANEL_WIDTH, Math.max(DEFAULT_RIGHT_PANEL_WIDTH, 20 * 16));
    setLeftCollapsed(false);
    setCollapsed(false);
    setPanelSize(leftPanel, leftWidth, safeHeight);
    setPanelSize(root, rightWidth, safeHeight);
    setLeftPanelPosition(viewportGap, viewportGap);
    setRightPanelPosition(window.innerWidth - rightWidth - viewportGap, viewportGap);
    suppressLayoutPersist = false;
    writeLayoutState();
  };

  const applySavedLayout = () => {
    if (isDestroyed()) {
      return;
    }
    suppressLayoutPersist = true;
    const layoutState = loadPanelLayoutState();
    if (layoutState.left) {
      setLeftCollapsed(Boolean(layoutState.left.collapsed));
      setPanelSize(
        leftPanel,
        Math.max(MIN_LEFT_PANEL_WIDTH, layoutState.left.width),
        Math.max(MIN_LEFT_PANEL_HEIGHT, layoutState.left.height)
      );
      setLeftPanelPosition(layoutState.left.left, layoutState.left.top);
    } else {
      const safeHeight = defaultPanelHeight();
      const leftWidth = Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(DEFAULT_LEFT_PANEL_WIDTH, 26 * 16));
      setLeftCollapsed(false);
      setPanelSize(leftPanel, leftWidth, safeHeight);
      setLeftPanelPosition(viewportGap, viewportGap);
    }

    if (layoutState.right) {
      setCollapsed(Boolean(layoutState.right.collapsed));
      setPanelSize(
        root,
        Math.max(MIN_RIGHT_PANEL_WIDTH, layoutState.right.width),
        Math.max(MIN_RIGHT_PANEL_HEIGHT, layoutState.right.height)
      );
      setRightPanelPosition(layoutState.right.left, layoutState.right.top);
    } else {
      const safeHeight = defaultPanelHeight();
      const rightWidth = Math.min(MAX_RIGHT_PANEL_WIDTH, Math.max(DEFAULT_RIGHT_PANEL_WIDTH, 20 * 16));
      setCollapsed(false);
      setPanelSize(root, rightWidth, safeHeight);
      setRightPanelPosition(window.innerWidth - rightWidth - viewportGap, viewportGap);
    }
    suppressLayoutPersist = false;
    if (!layoutState.left && !layoutState.right) {
      applyDefaultPanelLayout();
      return;
    }
    ensureDefaultDockSides();
    writeLayoutState();
  };

  const handleViewportResize = () => {
    hideVariablePopover();
    if (!arePanelsVisible()) {
      return;
    }
    clampPanelToViewport(root);
    clampPanelToViewport(leftPanel);
    ensureDefaultDockSides();
  };

  const resizeObserver: ResizeObserver | null =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          if (suppressLayoutPersist || isDestroyed() || !arePanelsVisible()) {
            return;
          }
          clampPanelToViewport(root);
          clampPanelToViewport(leftPanel);
          updateMediaLayoutMode();
          ensureDefaultDockSides();
          writeLayoutState();
        })
      : null;

  const startRightDrag = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    rightDragPointerId = event.pointerId;
    rightDragOffsetX = event.clientX - rect.left;
    rightDragOffsetY = event.clientY - rect.top;
  };

  const startLeftDrag = (event: PointerEvent) => {
    const rect = leftPanel.getBoundingClientRect();
    leftDragPointerId = event.pointerId;
    leftDragOffsetX = event.clientX - rect.left;
    leftDragOffsetY = event.clientY - rect.top;
  };

  headerTop.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent) || event.button !== 0) {
      return;
    }
    if (isTargetWithin(event.target, "button,input,select,textarea,a")) {
      return;
    }
    startRightDrag(event);
    headerTop.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  headerTop.addEventListener("pointermove", (event) => {
    if (!(event instanceof PointerEvent) || rightDragPointerId !== event.pointerId) {
      return;
    }
    setRightPanelPosition(event.clientX - rightDragOffsetX, event.clientY - rightDragOffsetY);
  });
  headerTop.addEventListener("pointerup", (event) => clearRightPanelDrag(event));
  headerTop.addEventListener("pointercancel", (event) => clearRightPanelDrag(event));

  leftHeader.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent) || event.button !== 0) {
      return;
    }
    if (isTargetWithin(event.target, "button,input,select,textarea,a")) {
      return;
    }
    startLeftDrag(event);
    leftHeader.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  leftHeader.addEventListener("pointermove", (event) => {
    if (!(event instanceof PointerEvent) || leftDragPointerId !== event.pointerId) {
      return;
    }
    setLeftPanelPosition(event.clientX - leftDragOffsetX, event.clientY - leftDragOffsetY);
  });
  leftHeader.addEventListener("pointerup", (event) => clearLeftPanelDrag(event));
  leftHeader.addEventListener("pointercancel", (event) => clearLeftPanelDrag(event));

  collapsedWrap.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent) || event.button !== 0) {
      return;
    }
    if (isTargetWithin(event.target, "button")) {
      return;
    }
    startRightDrag(event);
    collapsedWrap.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  collapsedWrap.addEventListener("pointermove", (event) => {
    if (!(event instanceof PointerEvent) || rightDragPointerId !== event.pointerId) {
      return;
    }
    setRightPanelPosition(event.clientX - rightDragOffsetX, event.clientY - rightDragOffsetY);
  });
  collapsedWrap.addEventListener("pointerup", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (collapsedWrap.hasPointerCapture(event.pointerId)) {
      collapsedWrap.releasePointerCapture(event.pointerId);
    }
    clearRightPanelDrag(event);
  });
  collapsedWrap.addEventListener("pointercancel", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (collapsedWrap.hasPointerCapture(event.pointerId)) {
      collapsedWrap.releasePointerCapture(event.pointerId);
    }
    clearRightPanelDrag(event);
  });

  leftCollapsedWrap.addEventListener("pointerdown", (event) => {
    if (!(event instanceof PointerEvent) || event.button !== 0) {
      return;
    }
    if (isTargetWithin(event.target, "button")) {
      return;
    }
    startLeftDrag(event);
    leftCollapsedWrap.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  leftCollapsedWrap.addEventListener("pointermove", (event) => {
    if (!(event instanceof PointerEvent) || leftDragPointerId !== event.pointerId) {
      return;
    }
    setLeftPanelPosition(event.clientX - leftDragOffsetX, event.clientY - leftDragOffsetY);
  });
  leftCollapsedWrap.addEventListener("pointerup", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (leftCollapsedWrap.hasPointerCapture(event.pointerId)) {
      leftCollapsedWrap.releasePointerCapture(event.pointerId);
    }
    clearLeftPanelDrag(event);
  });
  leftCollapsedWrap.addEventListener("pointercancel", (event) => {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    if (leftCollapsedWrap.hasPointerCapture(event.pointerId)) {
      leftCollapsedWrap.releasePointerCapture(event.pointerId);
    }
    clearLeftPanelDrag(event);
  });

  addResizeHandles(root, "wilderness-inspect-panel__resize");
  addResizeHandles(leftPanel, "wilderness-inspect-left__resize");
  consumePanelInteractions(root, isDestroyed);
  consumePanelInteractions(leftPanel, isDestroyed);
  consumeWheelInsidePanel(root);
  consumeWheelInsidePanel(leftPanel);

  window.addEventListener("resize", handleViewportResize);
  resizeObserver?.observe(root);
  resizeObserver?.observe(leftPanel);
  updateMediaLayoutMode();

  return {
    setCollapsed,
    setLeftCollapsed,
    setRightPanelPosition,
    setLeftPanelPosition,
    writeLayoutState,
    arePanelsVisible,
    applySavedLayout,
    hydrateAndApplySavedLayout: async () => {
      await hydratePanelLayoutState();
      applySavedLayout();
    },
    destroy: () => {
      window.removeEventListener("resize", handleViewportResize);
      resizeObserver?.disconnect();
    },
  };
};
