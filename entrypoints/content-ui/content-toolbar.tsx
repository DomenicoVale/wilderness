import * as React from "react";
import { getConsoleCount, subscribeConsoleStore } from "../../lib/console-store";
import { GUIDES_SETTINGS_EVENT } from "../../lib/events";
import { cn } from "../../lib/utils";
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
  const [isGuidesPopupOpen, setIsGuidesPopupOpen] = React.useState(false);
  const guidesPopupRef = React.useRef<HTMLDivElement | null>(null);
  const guidesTriggerRef = React.useRef<HTMLButtonElement | null>(null);

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

  React.useEffect(() => {
    if (toolState.guidesEnabled) {
      setIsGuidesPopupOpen(true);
      return;
    }

    setIsGuidesPopupOpen(false);
  }, [toolState.guidesEnabled]);

  React.useEffect(() => {
    if (!isGuidesPopupOpen || !toolState.guidesEnabled) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const popupElement = guidesPopupRef.current;
      const clickedInPopup =
        (target ? popupElement?.contains(target) : false) || (popupElement ? path.includes(popupElement) : false);
      if (clickedInPopup) {
        return;
      }

      const triggerElement = guidesTriggerRef.current;
      const clickedInTrigger =
        (target ? triggerElement?.contains(target) : false) || (triggerElement ? path.includes(triggerElement) : false);
      if (clickedInTrigger) {
        return;
      }

      setIsGuidesPopupOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isGuidesPopupOpen, toolState.guidesEnabled]);

  React.useEffect(() => {
    if (!isGuidesPopupOpen || !toolState.guidesEnabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsGuidesPopupOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGuidesPopupOpen, toolState.guidesEnabled]);

  return (
    <>
      {toolState.consolePanelOpen ? <ConsolePanel onClose={handleConsoleClose} /> : null}
      <div
        className={cn(
          "fixed left-1/2 z-[2147483647] -translate-x-1/2 transition-[bottom] duration-200",
          toolState.consolePanelOpen ? "bottom-[22rem]" : "bottom-5"
        )}
      >
        <div className="relative flex flex-col items-center gap-2">
          {toolState.guidesEnabled && isGuidesPopupOpen ? (
            <div
              ref={guidesPopupRef}
              className="mb-1 flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.55)] backdrop-blur"
            >
              <span className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Guides</span>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
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
          <div className="relative rounded-[2rem] border border-slate-200/80 bg-white/85 p-2 shadow-[0_28px_60px_-38px_rgba(15,23,42,0.9)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-8 bg-gradient-to-b from-white/80 to-transparent" />
            <div className="relative flex items-center gap-2">
              <MenuButton />
              <CustomToolsButton />
              <GuidesToggleButton
                enabled={toolState.guidesEnabled}
                settings={guidesSettings}
                buttonRef={guidesTriggerRef}
                onHoverWhileActive={() => {
                  setIsGuidesPopupOpen(true);
                }}
              />
              <InfoToggleButton enabled={toolState.infoEnabled} />
              <ConsoleToggleButton isOpen={toolState.consolePanelOpen} count={consoleCount} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
