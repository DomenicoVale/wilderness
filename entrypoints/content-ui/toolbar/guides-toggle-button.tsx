import * as React from "react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import {
  GUIDES_SETTINGS_EVENT,
  TOGGLE_GUIDES_EVENT,
} from "../../../lib/events";
import { setToolState } from "../tool-state";
export type GuidesSettings = {
  alwaysShowDimensions: boolean;
};

type GuidesToggleButtonProps = {
  enabled: boolean;
  settings: GuidesSettings;
};

export const GuidesToggleButton = ({
  enabled,
  settings,
}: GuidesToggleButtonProps) => {
  const handleToggle = () => {
    const next = !enabled;
    setToolState({ guidesEnabled: next });
    window.dispatchEvent(
      new CustomEvent(TOGGLE_GUIDES_EVENT, {
        detail: { enabled: next },
      }),
    );
    if (!next) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(GUIDES_SETTINGS_EVENT, {
        detail: settings,
      }),
    );
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleToggle}
      aria-pressed={enabled}
      aria-label="Toggle guides ruler"
      className={cn(
        enabled && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      Guides
    </Button>
  );
};
