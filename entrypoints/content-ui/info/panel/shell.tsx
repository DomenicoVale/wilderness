import { useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

type PanelElements = {
  root: HTMLDivElement;
  leftPanel: HTMLDivElement;
  leftCollapsedWrap: HTMLDivElement;
  leftCollapsedButton: HTMLButtonElement;
  leftCollapseButton: HTMLButtonElement;
  collapsedWrap: HTMLDivElement;
  collapsedButton: HTMLButtonElement;
  collapseButton: HTMLButtonElement;
  content: HTMLDivElement;
  headerTop: HTMLDivElement;
  leftHeader: HTMLDivElement;
  body: HTMLDivElement;
  sectionsHost: HTMLDivElement;
  treeList: HTMLDivElement;
  mediaList: HTMLDivElement;
};

type PanelMountApi = {
  setSelectorText: (next: string) => void;
  setCopyVisible: (visible: boolean) => void;
  pulseCopy: () => void;
  setStatus: (next: { message: string; tone: "success" | "error"; visible: boolean }) => void;
  setShowRestore: (visible: boolean) => void;
  setCopyAction: (action: (() => Promise<void> | void) | null) => void;
  setRestoreAction: (action: (() => Promise<void> | void) | null) => void;
};

export type PanelMount = {
  elements: PanelElements;
  api: PanelMountApi;
  unmount: () => void;
};

const PANEL_ELEMENT_KEYS: Array<keyof PanelElements> = [
  "root",
  "leftPanel",
  "leftCollapsedWrap",
  "leftCollapsedButton",
  "leftCollapseButton",
  "collapsedWrap",
  "collapsedButton",
  "collapseButton",
  "content",
  "headerTop",
  "leftHeader",
  "body",
  "sectionsHost",
  "treeList",
  "mediaList",
];

/**
 * Mounts the inspect panel shell as a React portal and exposes an imperative
 * bridge API for the panel orchestrator.
 */
export const createPanelMount = (): PanelMount => {
  const mountParent = document.documentElement ?? document.body;
  if (!mountParent) {
    throw new Error("[Inspect] Unable to mount panel shell: no document root.");
  }

  const reactHost = document.createElement("div");
  reactHost.style.display = "none";
  mountParent.append(reactHost);
  const reactRoot = createRoot(reactHost);
  let isUnmounted = false;

  const refs: Partial<PanelElements> = {};
  const copyActionRef: { current: (() => Promise<void> | void) | null } = { current: null };
  const restoreActionRef: { current: (() => Promise<void> | void) | null } = { current: null };
  const api: PanelMountApi = {
    setSelectorText: () => undefined,
    setCopyVisible: () => undefined,
    pulseCopy: () => undefined,
    setStatus: () => undefined,
    setShowRestore: () => undefined,
    setCopyAction: (action) => {
      copyActionRef.current = action;
    },
    setRestoreAction: (action) => {
      restoreActionRef.current = action;
    },
  };
  // This keeps all DOM refs in one keyed map so non-React panel orchestration can
  // target specific nodes (drag handles, tree/media hosts, section host) without
  // repeated querySelector lookups.
  const setRef =
    <K extends keyof PanelElements>(key: K) =>
    (node: PanelElements[K] | null) => {
      if (node) {
        refs[key] = node;
      }
    };

  const PanelShell = () => {
    const [selectorText, setSelectorText] = useState("[NO SELECTION]");
    const [copyVisible, setCopyVisible] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [status, setStatus] = useState<{ message: string; tone: "success" | "error"; visible: boolean }>({
      message: "",
      tone: "success",
      visible: false,
    });
    const [showRestore, setShowRestore] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);

    // The mount API is the bridge from imperative inspect logic to React shell state.
    api.setSelectorText = setSelectorText;
    api.setCopyVisible = (visible) => {
      setCopyVisible(visible);
      if (!visible) {
        setIsCopying(false);
      }
    };
    api.pulseCopy = () => {
      setIsCopying(false);
      requestAnimationFrame(() => {
        if (!isUnmounted) {
          setIsCopying(true);
        }
      });
    };
    api.setStatus = setStatus;
    api.setShowRestore = setShowRestore;

    return createPortal(
      <>
        <div
          ref={setRef("leftPanel")}
          className="wilderness-inspect-left"
          data-collapsed="false"
          data-media-layout="wide"
          style={{ display: "none" }}
        >
          <div ref={setRef("leftCollapsedWrap")} className="wilderness-inspect-left__collapsed">
            <button
              ref={setRef("leftCollapsedButton")}
              type="button"
              className="wilderness-inspect-left__collapsed-btn"
              aria-label="Expand inspect tree"
            >
              +
            </button>
            <div className="wilderness-inspect-left__collapsed-label">TREE</div>
          </div>

          <div className="wilderness-inspect-left__content">
            <div ref={setRef("leftHeader")} className="wilderness-inspect-left__header">
              <div className="wilderness-inspect-left__title">TREE</div>
              <button
                ref={setRef("leftCollapseButton")}
                type="button"
                className="wilderness-inspect-left__toggle"
                aria-label="Collapse inspect tree"
              >
                [-]
              </button>
            </div>
            <section className="wilderness-inspect-left__section">
              <div className="wilderness-inspect-left__section-title">DOM Tree</div>
              <div ref={setRef("treeList")} className="wilderness-inspect-tree" />
            </section>
            <section className="wilderness-inspect-left__section">
              <div className="wilderness-inspect-left__section-title">Quick media</div>
              <div ref={setRef("mediaList")} className="wilderness-inspect-media" />
            </section>
          </div>
        </div>

        <div ref={setRef("root")} className="wilderness-inspect-panel" data-collapsed="false" style={{ display: "none" }}>
          <div ref={setRef("collapsedWrap")} className="wilderness-inspect-panel__collapsed">
            <button
              ref={setRef("collapsedButton")}
              type="button"
              className="wilderness-inspect-panel__collapsed-btn"
              aria-label="Expand inspect panel"
            >
              +
            </button>
            <div className="wilderness-inspect-panel__collapsed-label">INSP</div>
          </div>

          <div ref={setRef("content")} className="wilderness-inspect-panel__content">
            <div className="wilderness-inspect-panel__header">
              <div ref={setRef("headerTop")} className="wilderness-inspect-panel__header-top">
                <div className="wilderness-inspect-panel__title">INSPECT</div>
                <button
                  ref={setRef("collapseButton")}
                  type="button"
                  className="wilderness-inspect-panel__toggle"
                  aria-label="Collapse inspect panel"
                >
                  [-]
                </button>
              </div>
              <div className="wilderness-inspect-panel__selector-wrap">
                <button
                  type="button"
                  className="wilderness-inspect-panel__selector"
                  title="Copy selector"
                  aria-label="Copy selector"
                  data-copying={isCopying ? "true" : undefined}
                  onClick={() => {
                    void copyActionRef.current?.();
                  }}
                >
                  {selectorText}
                </button>
                <span
                  className="wilderness-inspect-panel__copy-tooltip"
                  data-visible={copyVisible ? "true" : "false"}
                  aria-hidden="true"
                >
                  Copied
                </span>
                <span
                  className="wilderness-inspect-panel__status-tooltip"
                  data-visible={status.visible ? "true" : "false"}
                  data-tone={status.tone}
                  aria-hidden="true"
                >
                  {status.message}
                </span>
              </div>
            </div>

            <div ref={setRef("body")} className="wilderness-inspect-panel__sections">
              <div ref={setRef("sectionsHost")} />
              {showRestore ? (
                <div className="wilderness-inspect-restore">
                  <button
                    type="button"
                    className="wilderness-inspect-restore__button"
                    disabled={isRestoring}
                    onClick={async () => {
                      if (!restoreActionRef.current || isRestoring) {
                        return;
                      }
                      setIsRestoring(true);
                      try {
                        await restoreActionRef.current();
                      } finally {
                        if (!isUnmounted) {
                          setIsRestoring(false);
                        }
                      }
                    }}
                  >
                    [RESTORE SAVED STATE]
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </>,
      mountParent
    );
  };

  flushSync(() => {
    reactRoot.render(<PanelShell />);
  });

  for (const key of PANEL_ELEMENT_KEYS) {
    if (!refs[key]) {
      reactRoot.unmount();
      reactHost.remove();
      throw new Error(`[Inspect] Missing panel shell ref: ${key}`);
    }
  }

  return {
    elements: refs as PanelElements,
    api,
    unmount: () => {
      isUnmounted = true;
      reactRoot.unmount();
      reactHost.remove();
    },
  };
};
