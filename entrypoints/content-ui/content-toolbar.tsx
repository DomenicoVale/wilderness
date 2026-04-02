import * as React from "react";
import { getConsoleCount, subscribeConsoleStore } from "../../lib/console-store";
import { openCustomToolsEditor } from "../../lib/custom-tools-actions";
import { useCustomToolsStore } from "../../lib/custom-tools-store";
import {
  GUIDES_SETTINGS_EVENT,
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
    font-size: 10px;
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
    font-size: 10px;
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
    font-size: 10px;
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
    font-size: 10px;
    color: #e0e0e0;
    padding: 2px 6px;
    user-select: none;
    letter-spacing: 0.02em;
  }
  .wld-hud-collapse:hover { color: #fff; background: rgba(255,255,255,0.08); }
`;

export function ContentToolbar() {
  const toolState = React.useSyncExternalStore(subscribeToolState, getToolState);
  const consoleCount = React.useSyncExternalStore(subscribeConsoleStore, getConsoleCount);
  const [guidesSettings, setGuidesSettings] = React.useState<GuidesSettings>({
    alwaysShowDimensions: false,
    keepPairDistances: true,
  });
  const [infoSettings, setInfoSettings] = React.useState<InfoSettings>({
    showTooltipOnClick: true,
    showActualLayoutDistances: true,
  });
  const activeToolIds = useCustomToolsStore((state) => state.activeToolIds);
  const activeCount = activeToolIds.length;
  const [expanded, setExpanded] = React.useState(true);
  const [animKey, setAnimKey] = React.useState(0);

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

  const toggleGuides = () => window.dispatchEvent(new CustomEvent(TOGGLE_GUIDES_EVENT));
  const toggleInfo = () => window.dispatchEvent(new CustomEvent(TOGGLE_INFO_EVENT));
  const toggleConsole = () => window.dispatchEvent(new CustomEvent(TOGGLE_CONSOLE_EVENT));
  const toggleDims = () =>
    updateGuidesSettings({ ...guidesSettings, alwaysShowDimensions: !guidesSettings.alwaysShowDimensions });
  const toggleMeas = () => updateGuidesSettings({ ...guidesSettings, keepPairDistances: !guidesSettings.keepPairDistances });
  const toggleClickTip = () => updateInfoSettings({ ...infoSettings, showTooltipOnClick: !infoSettings.showTooltipOnClick });
  const toggleLayoutDistanceMode = () =>
    updateInfoSettings({ ...infoSettings, showActualLayoutDistances: !infoSettings.showActualLayoutDistances });
  const openTools = () => void openCustomToolsEditor();

  const delays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390];
  const items: React.ReactNode[] = [];
  let idx = 0;

  const btn = (label: string, active: boolean, onClick: () => void, key: string, tooltip: string) => (
    <button
      type="button"
      key={key}
      className={`wld-hud-btn${active ? " active" : ""}`}
      style={{ animationDelay: `${delays[idx++] ?? 390}ms` }}
      onClick={onClick}
      title={tooltip}
    >
      {label}
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
    btn(`[INFO${toolState.infoEnabled ? ":ON" : ":OFF"}]`, toolState.infoEnabled, toggleInfo, "info", "Toggle element inspector")
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
        `[CLICKTIP:${infoSettings.showTooltipOnClick ? "ON" : "OFF"}]`,
        infoSettings.showTooltipOnClick,
        toggleClickTip,
        "click-tip",
        "Toggle tooltip pinning on click"
      )
    );
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
  }
  items.push(sep());
  items.push(
    btn(`[TOOLS${activeCount > 0 ? `(${activeCount})` : ""}]`, activeCount > 0, openTools, "tools", "Open custom tools editor")
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
      [-]
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
              [+]
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
