import * as React from "react";
import { getConsoleCount, subscribeConsoleStore } from "../../lib/console-store";
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
import type { InfoSettings } from "./info/info-tool";
import { getToolState, setToolState, subscribeToolState } from "./tool-state";
import type { GuidesSettings } from "./toolbar/guides-toggle-button";

const HUD_STYLES = `
  @keyframes hudLineGrow {
    0% { clip-path: inset(0 50% 0 50%); opacity: 1; }
    100% { clip-path: inset(0 0 0 0); opacity: 1; }
  }
  @keyframes hudItemIn {
    0% { opacity: 0; transform: translateY(-4px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .wld-hud {
    position: fixed;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .wld-hud-bar {
    pointer-events: all;
    display: flex;
    align-items: center;
    gap: 0;
    background: rgba(0,0,0,0.75);
    border: 1px solid rgba(255,255,255,0.15);
    padding: 2px 4px;
    position: relative;
  }
  .wld-hud-line {
    height: 1px;
    background: rgba(255,255,255,0.4);
    width: 120px;
    animation: hudLineGrow 0.15s ease-out forwards;
    pointer-events: none;
  }
  .wld-hud-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    padding: 2px 4px;
    color: #e0e0e0;
    white-space: nowrap;
    user-select: none;
    opacity: 0;
    animation: hudItemIn 0.12s ease-out forwards;
    letter-spacing: 0.02em;
  }
  .wld-hud-btn:hover {
    color: #ffffff;
    background: rgba(255,255,255,0.08);
  }
  .wld-hud-btn.active {
    color: #00ff88;
  }
  .wld-hud-btn.active:hover {
    color: #33ffaa;
  }
  .wld-hud-sep {
    color: rgba(255,255,255,0.2);
    font-size: 11px;
    padding: 0 1px;
    pointer-events: none;
    opacity: 0;
    animation: hudItemIn 0.12s ease-out forwards;
    user-select: none;
  }
  .wld-hud-collapse {
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    color: #e0e0e0;
    padding: 2px 6px;
    user-select: none;
    letter-spacing: 0.02em;
  }
  .wld-hud-collapse:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .wld-hud-tools-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .wld-hud-submenu {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 280px;
    max-width: 320px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.92);
    box-shadow: 0 6px 20px rgba(0,0,0,0.45);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 1;
  }
  .wld-hud-submenu-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .wld-hud-submenu-title {
    color: rgba(255,255,255,0.65);
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 4px;
    user-select: none;
  }
  .wld-hud-submenu-divider {
    border: 0;
    border-top: 1px solid rgba(255,255,255,0.14);
    margin: 0;
  }
  .wld-hud-submenu-btn {
    width: 100%;
    background: none;
    border: none;
    color: #e0e0e0;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.02em;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    cursor: pointer;
    text-align: left;
  }
  .wld-hud-submenu-btn:hover {
    color: #fff;
    background: rgba(255,255,255,0.08);
  }
  .wld-hud-submenu-btn.active {
    color: #00ff88;
  }
  .wld-hud-submenu-btn.active:hover {
    color: #33ffaa;
  }
  .wld-hud-submenu-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .wld-hud-submenu-state {
    flex: 0 0 auto;
    font-size: 10px;
    color: rgba(255,255,255,0.7);
  }
  .wld-hud-submenu-btn.active .wld-hud-submenu-state {
    color: inherit;
  }
  .wld-hud-submenu-empty {
    color: rgba(255,255,255,0.5);
    font-size: 10px;
    padding: 4px;
    user-select: none;
  }
`;

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
  const consoleCount = React.useSyncExternalStore(subscribeConsoleStore, getConsoleCount);
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
  const toolsMenuRef = React.useRef<HTMLDivElement | null>(null);
  const toolsTriggerRef = React.useRef<HTMLButtonElement | null>(null);

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
    btn(
      `[CONSOLE${toolState.consolePanelOpen ? ":ON" : ""}${consoleCount > 0 ? `(${consoleCount})` : ""}]`,
      toolState.consolePanelOpen,
      toggleConsole,
      "console",
      "Toggle console panel"
    )
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
      <style>{HUD_STYLES}</style>
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
