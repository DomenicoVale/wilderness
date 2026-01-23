import * as React from "react";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { cn } from "../../lib/utils";
import { getToolState, setToolState, subscribeToolState } from "./tool_state";

const MENU_ITEMS = [
  { label: "Inspect styles", value: "inspect" },
  { label: "Capture colors", value: "colors" },
  { label: "Log DOM info", value: "dom-info" },
] as const;

const handleAlert = () => {
  window.alert("Wilderness: sample action triggered.");
};

export function ContentToolbar() {
  const toolState = React.useSyncExternalStore(
    subscribeToolState,
    getToolState,
  );
  const [guidesSettings, setGuidesSettings] = React.useState({
    alwaysShowDimensions: false,
  });

  const handleGuidesToggle = () => {
    const next = !toolState.guidesEnabled;
    setToolState({ guidesEnabled: next });
    window.dispatchEvent(
      new CustomEvent("wilderness:toggle-guides", {
        detail: { enabled: next },
      }),
    );
    if (next) {
      window.dispatchEvent(
        new CustomEvent("wilderness:guides-settings", {
          detail: guidesSettings,
        }),
      );
    }
  };

  const handleInfoToggle = () => {
    const next = !toolState.infoEnabled;
    setToolState({ infoEnabled: next });
    window.dispatchEvent(
      new CustomEvent("wilderness:toggle-info", {
        detail: { enabled: next },
      }),
    );
  };

  const toggleSetting = (key: keyof typeof guidesSettings) => {
    setGuidesSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      window.dispatchEvent(
        new CustomEvent("wilderness:guides-settings", {
          detail: next,
        }),
      );
      return next;
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[2147483647] -translate-x-1/2">
      <div className="relative flex flex-col items-center">
        {toolState.guidesEnabled ? (
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
              <Button
                size="sm"
                variant="secondary"
                aria-pressed={guidesSettings.alwaysShowDimensions}
                aria-label="Toggle always showing selection dimensions"
                className={cn(
                  guidesSettings.alwaysShowDimensions &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                onClick={() => {
                  toggleSetting("alwaysShowDimensions");
                }}
              >
                Always show dims
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleGuidesToggle}
            aria-pressed={toolState.guidesEnabled}
            aria-label="Toggle guides ruler"
            className={cn(
              toolState.guidesEnabled &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            Guides
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInfoToggle}
            aria-pressed={toolState.infoEnabled}
            aria-label="Toggle info inspector"
            className={cn(
              toolState.infoEnabled &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            Info
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                aria-label="Open tools menu"
              >
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {MENU_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.value}
                  onSelect={() => {
                    console.info(`[wilderness] Selected menu: ${item.value}`);
                  }}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleAlert}>
                Sample alert
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <p className="text-sm text-muted-foreground">
            Welcome to Wilderness.
          </p>

          <Button
            size="sm"
            onClick={handleAlert}
            aria-label="Show sample alert"
          >
            Try alert
          </Button>
        </div>
      </div>
    </div>
  );
}
