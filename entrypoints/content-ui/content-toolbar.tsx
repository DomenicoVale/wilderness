import * as React from "react";
import { getConsoleCount, subscribeConsoleStore } from "../../lib/console-store";
import { GUIDES_SETTINGS_EVENT } from "../../lib/events";
import { ConsolePanel } from "./console/console-panel";
import { getToolState, setToolState, subscribeToolState } from "./tool-state";
import { ConsoleToggleButton } from "./toolbar/console-toggle-button";
import { CustomToolsButton } from "./toolbar/custom-tools-button";
import { GuidesSettingsButton } from "./toolbar/guides-settings-button";
import { type GuidesSettings, GuidesToggleButton } from "./toolbar/guides-toggle-button";
import { InfoToggleButton } from "./toolbar/info-toggle-button";
import { MenuButton } from "./toolbar/menu-button";

export function ContentToolbar() {
  const toolState = React.useSyncExternalStore(subscribeToolState, getToolState);
  const consoleCount = React.useSyncExternalStore(subscribeConsoleStore, getConsoleCount);
  const [guidesSettings, setGuidesSettings] = React.useState<GuidesSettings>({
    alwaysShowDimensions: false,
  });

  const handleConsoleClose = () => {
    setToolState({ consolePanelOpen: false });
  };

  const updateGuidesSettings = (next: GuidesSettings) => {
    setGuidesSettings(next);
    window.dispatchEvent(
      new CustomEvent(GUIDES_SETTINGS_EVENT, {
        detail: next,
      })
    );
  };

  return (
    <>
      {toolState.consolePanelOpen ? <ConsolePanel onClose={handleConsoleClose} /> : null}
      <div className="fixed bottom-6 left-1/2 z-[2147483647] -translate-x-1/2">
        <div className="relative flex flex-col items-center">
          {toolState.guidesEnabled ? (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
                <GuidesSettingsButton
                  enabled={guidesSettings.alwaysShowDimensions}
                  onToggle={() =>
                    updateGuidesSettings({
                      ...guidesSettings,
                      alwaysShowDimensions: !guidesSettings.alwaysShowDimensions,
                    })
                  }
                />
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
            <MenuButton />
            <CustomToolsButton />
            <GuidesToggleButton enabled={toolState.guidesEnabled} settings={guidesSettings} />
            <InfoToggleButton enabled={toolState.infoEnabled} />
            <ConsoleToggleButton isOpen={toolState.consolePanelOpen} count={consoleCount} />
          </div>
        </div>
      </div>
    </>
  );
}
