import * as React from "react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { TOGGLE_INFO_EVENT } from "../../../lib/events";
import { setToolState } from "../tool-state";

type InfoToggleButtonProps = {
  enabled: boolean;
};

export const InfoToggleButton = ({ enabled }: InfoToggleButtonProps) => {
  const handleToggle = () => {
    const next = !enabled;
    setToolState({ infoEnabled: next });
    window.dispatchEvent(
      new CustomEvent(TOGGLE_INFO_EVENT, {
        detail: { enabled: next },
      }),
    );
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleToggle}
      aria-pressed={enabled}
      aria-label="Toggle info inspector"
      className={cn(
        enabled && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      Info
    </Button>
  );
};
