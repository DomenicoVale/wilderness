import { TriangleAlert } from "lucide-react";
import * as React from "react";
import { type ConsoleEntry, formatArg, getConsoleEntries, subscribeConsoleStore } from "../../lib/console-store";
import { openCustomToolsEditor } from "../../lib/custom-tools/actions";
import { ensureCustomToolBridgeAvailable } from "../../lib/custom-tools/runner";
import { toggleActiveCustomToolId, useCustomToolsStore } from "../../lib/custom-tools/store";
import {
  GUIDES_SETTINGS_EVENT,
  INFO_CLEAR_STATE_EVENT,
  INFO_SAVE_STATE_EVENT,
  INFO_SETTINGS_EVENT,
  TOGGLE_CONSOLE_EVENT,
  TOGGLE_GUIDES_EVENT,
  TOGGLE_INFO_EVENT,
} from "../../lib/events";
import { ConsolePanel } from "./console/console-panel";
import type { GuidesSettings } from "./guides/guides-tool";
import type { InfoSettings } from "./info/core";
import { getToolState, setToolState, subscribeToolState } from "./tool-state";

const ERROR_BUBBLE_TEXT_MAX_LENGTH = 100;
const ERROR_BUBBLE_VISIBLE_MS = 1500;
const ERROR_BUBBLE_POP_MS = 180;
const ERROR_BUBBLE_VERTICAL_START = 8;

type ErrorBubble = {
  id: string;
  message: string;
};

const isErrorEntry = (entry: ConsoleEntry) => entry.method === "error" || entry.isUncaught || entry.isUnhandledRejection;

const summarizeConsoleError = (entry: ConsoleEntry) => {
  const firstErrorArg = entry.args.find((arg) => arg.type === "error");
  const joined = firstErrorArg ? formatArg(firstErrorArg) : entry.args.map((arg) => formatArg(arg)).join(" ");
  const normalized = joined.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Unknown error";
  }
  if (normalized.length <= ERROR_BUBBLE_TEXT_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, ERROR_BUBBLE_TEXT_MAX_LENGTH - 1)}…`;
};

function ErrorBubbleToast({ bubble, onDismiss }: { bubble: ErrorBubble; onDismiss: (id: string) => void }) {
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    const leaveTimeout = window.setTimeout(() => {
      setLeaving(true);
    }, ERROR_BUBBLE_VISIBLE_MS);
    const removeTimeout = window.setTimeout(() => {
      onDismiss(bubble.id);
    }, ERROR_BUBBLE_VISIBLE_MS + ERROR_BUBBLE_POP_MS);

    return () => {
      window.clearTimeout(leaveTimeout);
      window.clearTimeout(removeTimeout);
    };
  }, [bubble.id, onDismiss]);

  return (
    <div
      className="wld-hud-error-bubble"
      data-state={leaving ? "leaving" : "visible"}
      style={{ top: `calc(100% + ${ERROR_BUBBLE_VERTICAL_START}px)` }}
    >
      <TriangleAlert className="wld-hud-error-bubble-icon" aria-hidden="true" />
      <span className="wld-hud-error-bubble-text">{bubble.message}</span>
    </div>
  );
}

const isEventWithinNode = (event: Event, node: Node | null) => {
  if (!node) {
    return false;
  }

  const target = event.target;
  if (target instanceof Node && node.contains(target)) {
    return true;
  }

  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  return path.includes(node);
};

export function ContentToolbar() {
  const toolState = React.useSyncExternalStore(subscribeToolState, getToolState);
  const consoleEntries = React.useSyncExternalStore(subscribeConsoleStore, getConsoleEntries);
  const consoleCount = React.useMemo(() => consoleEntries.length, [consoleEntries]);
  const tools = useCustomToolsStore((state) => state.tools);
  const [guidesSettings, setGuidesSettings] = React.useState<GuidesSettings>({
    alwaysShowDimensions: false,
    keepPairDistances: true,
  });
  const [infoSettings, setInfoSettings] = React.useState<InfoSettings>({
    showActualLayoutDistances: true,
  });
  const customToolsStatus = useCustomToolsStore((state) => state.status);
  const activeToolIds = useCustomToolsStore((state) => state.activeToolIds);
  const activeCount = activeToolIds.length;
  const activeToolSet = React.useMemo(() => new Set(activeToolIds), [activeToolIds]);
  const [expanded, setExpanded] = React.useState(true);
  const [toolsMenuOpen, setToolsMenuOpen] = React.useState(false);
  const [animKey, setAnimKey] = React.useState(0);
  const [errorBubbles, setErrorBubbles] = React.useState<ErrorBubble[]>([]);
  const toolsMenuRef = React.useRef<HTMLDivElement | null>(null);
  const toolsTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const bubbleIdRef = React.useRef(0);
  const consoleEntryCountRef = React.useRef(consoleEntries.length);

  const handleConsoleClose = () => setToolState({ consolePanelOpen: false });

  const updateGuidesSettings = (next: GuidesSettings) => {
    setGuidesSettings(next);
    window.dispatchEvent(new CustomEvent(GUIDES_SETTINGS_EVENT, { detail: next }));
  };
  const updateInfoSettings = (next: InfoSettings) => {
    setInfoSettings(next);
    window.dispatchEvent(new CustomEvent(INFO_SETTINGS_EVENT, { detail: next }));
  };

  const toggleExpand = () => {
    if (!expanded) setAnimKey((k) => k + 1);
    setExpanded((e) => !e);
  };

  const toggleGuides = () => {
    const enabling = !toolState.guidesEnabled;
    window.dispatchEvent(new CustomEvent(TOGGLE_GUIDES_EVENT));
    if (enabling) {
      window.dispatchEvent(new CustomEvent(GUIDES_SETTINGS_EVENT, { detail: guidesSettings }));
    }
  };
  const toggleInfo = () => {
    const enabling = !toolState.infoEnabled;
    window.dispatchEvent(new CustomEvent(TOGGLE_INFO_EVENT));
    if (enabling) {
      window.dispatchEvent(new CustomEvent(INFO_SETTINGS_EVENT, { detail: infoSettings }));
    }
  };
  const toggleConsole = () => window.dispatchEvent(new CustomEvent(TOGGLE_CONSOLE_EVENT));
  const toggleDims = () =>
    updateGuidesSettings({ ...guidesSettings, alwaysShowDimensions: !guidesSettings.alwaysShowDimensions });
  const toggleMeas = () => updateGuidesSettings({ ...guidesSettings, keepPairDistances: !guidesSettings.keepPairDistances });
  const toggleLayoutDistanceMode = () =>
    updateInfoSettings({ ...infoSettings, showActualLayoutDistances: !infoSettings.showActualLayoutDistances });
  const saveInfoState = () => window.dispatchEvent(new CustomEvent(INFO_SAVE_STATE_EVENT));
  const clearInfoState = () => window.dispatchEvent(new CustomEvent(INFO_CLEAR_STATE_EVENT));
  const toggleToolsMenu = () => setToolsMenuOpen((open) => !open);
  const openToolsEditorFromMenu = () => {
    setToolsMenuOpen(false);
    window.setTimeout(() => {
      void openCustomToolsEditor();
    }, 0);
  };
  const toggleCustomTool = async (toolId: string) => {
    const isActive = activeToolSet.has(toolId);
    if (!isActive) {
      const bridgeAvailability = await ensureCustomToolBridgeAvailable();
      if (!bridgeAvailability.ok) {
        console.warn(
          "[wilderness] Custom tool activation is blocked.",
          bridgeAvailability.error ?? "Unknown custom tool bridge failure."
        );
        void openCustomToolsEditor();
        return;
      }
    }

    void toggleActiveCustomToolId(toolId, !isActive);
  };

  React.useEffect(() => {
    if (!toolsMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isEventWithinNode(event, toolsMenuRef.current) || isEventWithinNode(event, toolsTriggerRef.current)) {
        return;
      }

      setToolsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setToolsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toolsMenuOpen]);

  React.useEffect(() => {
    if (!expanded) {
      setToolsMenuOpen(false);
    }
  }, [expanded]);

  React.useEffect(() => {
    if (consoleEntries.length < consoleEntryCountRef.current) {
      consoleEntryCountRef.current = 0;
      setErrorBubbles([]);
    }

    const nextEntries = consoleEntries.slice(consoleEntryCountRef.current);
    if (nextEntries.length === 0) {
      consoleEntryCountRef.current = consoleEntries.length;
      return;
    }

    const errorEntries = nextEntries.filter(isErrorEntry);
    if (errorEntries.length > 0) {
      const latestEntry = errorEntries[errorEntries.length - 1];
      setErrorBubbles([
        {
          id: `error-bubble-${bubbleIdRef.current++}`,
          message: summarizeConsoleError(latestEntry),
        },
      ]);
    }

    consoleEntryCountRef.current = consoleEntries.length;
  }, [consoleEntries]);

  const dismissErrorBubble = React.useCallback((id: string) => {
    setErrorBubbles((current) => current.filter((bubble) => bubble.id !== id));
  }, []);

  const delays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390];
  const items: React.ReactNode[] = [];
  let idx = 0;
  const shortcutLabel = (label: string) => {
    const open = label.indexOf("[");
    const close = label.indexOf("]");
    if (open < 0 || close <= open + 1) {
      return label;
    }
    const inside = label.slice(open + 1, close);
    const first = inside.charAt(0);
    const rest = inside.slice(1);
    return (
      <>
        {label.slice(0, open + 1)}
        <u>{first}</u>
        {rest}
        {label.slice(close)}
      </>
    );
  };

  const btn = (label: string, active: boolean, onClick: () => void, key: string, tooltip: string) => (
    <button
      type="button"
      key={key}
      className={`wld-hud-btn${active ? " active" : ""}`}
      style={{ animationDelay: `${delays[idx++] ?? 390}ms` }}
      onClick={onClick}
      title={tooltip}
    >
      {shortcutLabel(label)}
    </button>
  );

  const sep = () => {
    const s = (
      <span key={`sep-${idx}`} className="wld-hud-sep" style={{ animationDelay: `${delays[idx] ?? 390}ms` }}>
        |
      </span>
    );
    idx++;
    return s;
  };

  items.push(
    btn(
      `[GUIDES${toolState.guidesEnabled ? ":ON" : ":OFF"}]`,
      toolState.guidesEnabled,
      toggleGuides,
      "guides",
      "Toggle element rulers / guides mode"
    )
  );
  items.push(sep());
  items.push(
    btn(
      `[INSPECT${toolState.infoEnabled ? ":ON" : ":OFF"}]`,
      toolState.infoEnabled,
      toggleInfo,
      "info",
      "Toggle element inspector"
    )
  );
  items.push(sep());
  items.push(
    <div key="console-wrap" className="wld-hud-console-wrap">
      {btn(
        `[CONSOLE${toolState.consolePanelOpen ? ":ON" : ""}${consoleCount > 0 ? `(${consoleCount})` : ""}]`,
        toolState.consolePanelOpen,
        toggleConsole,
        "console",
        "Toggle console panel"
      )}
      {errorBubbles.map((bubble) => (
        <ErrorBubbleToast key={bubble.id} bubble={bubble} onDismiss={dismissErrorBubble} />
      ))}
    </div>
  );
  if (toolState.guidesEnabled) {
    items.push(sep());
    items.push(
      btn(
        `[DIMS:${guidesSettings.alwaysShowDimensions ? "ON" : "OFF"}]`,
        guidesSettings.alwaysShowDimensions,
        toggleDims,
        "dims",
        "Toggle always-show dimension labels"
      )
    );
    items.push(sep());
    items.push(
      btn(
        `[MEAS:${guidesSettings.keepPairDistances ? "ON" : "OFF"}]`,
        guidesSettings.keepPairDistances,
        toggleMeas,
        "meas",
        "Keep measurement lines on frozen pairs"
      )
    );
  }
  if (toolState.infoEnabled) {
    items.push(sep());
    items.push(
      btn(
        `[LAYOUTDIST:${infoSettings.showActualLayoutDistances ? "ON" : "OFF"}]`,
        infoSettings.showActualLayoutDistances,
        toggleLayoutDistanceMode,
        "layout-dist",
        "Toggle full whitespace distance vs CSS layout gap"
      )
    );
    items.push(sep());
    items.push(btn("[SAVE STATE]", false, saveInfoState, "save-info-state", "Save inspect edits and panel layout"));
    items.push(sep());
    items.push(btn("[CLEAR STATE]", false, clearInfoState, "clear-info-state", "Clear saved inspect edits and layout"));
  }
  items.push(sep());
  const toolsButtonDelay = `${delays[idx++] ?? 390}ms`;
  items.push(
    <div key="tools-wrap" className="wld-hud-tools-wrap" ref={toolsMenuRef}>
      <button
        type="button"
        ref={toolsTriggerRef}
        className={`wld-hud-btn${activeCount > 0 || toolsMenuOpen ? " active" : ""}`}
        style={{ animationDelay: toolsButtonDelay }}
        onClick={toggleToolsMenu}
        title="Open tools menu"
        aria-haspopup="menu"
        aria-expanded={toolsMenuOpen}
      >
        {shortcutLabel(`[TOOLS${activeCount > 0 ? `(${activeCount})` : ""}]`)}
      </button>
      {toolsMenuOpen ? (
        <div className="wld-hud-submenu" role="menu" aria-label="Toolbar tools menu">
          <section className="wld-hud-submenu-section">
            <div className="wld-hud-submenu-title">Tools</div>
            <div className="wld-hud-submenu-empty">More coming soon.</div>
          </section>
          <hr className="wld-hud-submenu-divider" />
          <section className="wld-hud-submenu-section">
            <div className="wld-hud-submenu-title">Custom tools</div>
            {customToolsStatus === "loading" ? (
              <div className="wld-hud-submenu-empty">Loading custom tools…</div>
            ) : tools.length > 0 ? (
              tools.map((tool) => {
                const isActive = activeToolSet.has(tool.id);
                return (
                  <button
                    type="button"
                    key={tool.id}
                    className={`wld-hud-submenu-btn${isActive ? " active" : ""}`}
                    onClick={() => {
                      void toggleCustomTool(tool.id);
                    }}
                    title={tool.name}
                  >
                    <span className="wld-hud-submenu-name">{tool.name}</span>
                    <span className="wld-hud-submenu-state">{isActive ? "ON" : "OFF"}</span>
                  </button>
                );
              })
            ) : (
              <div className="wld-hud-submenu-empty">No custom tools yet.</div>
            )}
            <button type="button" className="wld-hud-submenu-btn" onClick={openToolsEditorFromMenu}>
              <span className="wld-hud-submenu-name">{shortcutLabel("[CREATE/EDIT CUSTOM TOOLS]")}</span>
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
  items.push(sep());
  items.push(
    <button
      type="button"
      key="collapse"
      className="wld-hud-btn"
      style={{ animationDelay: `${delays[idx++] ?? 390}ms` }}
      onClick={toggleExpand}
      title="Collapse toolbar"
    >
      {shortcutLabel("[-]")}
    </button>
  );

  return (
    <>
      {toolState.consolePanelOpen ? <ConsolePanel onClose={handleConsoleClose} /> : null}
      <div className="wld-hud">
        {!expanded ? (
          <div className="wld-hud-bar">
            <button type="button" className="wld-hud-collapse" onClick={toggleExpand}>
              {shortcutLabel("[+]")}
            </button>
          </div>
        ) : (
          <>
            <div key={`line-${animKey}`} className="wld-hud-line" />
            <div className="wld-hud-bar" key={`bar-${animKey}`}>
              {items}
            </div>
          </>
        )}
      </div>
    </>
  );
}
