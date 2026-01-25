import * as React from "react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";

type GuidesSettingsButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};

export const GuidesSettingsButton = ({
  enabled,
  onToggle,
}: GuidesSettingsButtonProps) => {
  return (
    <Button
      size="sm"
      variant="secondary"
      aria-pressed={enabled}
      aria-label="Toggle always showing selection dimensions"
      className={cn(
        enabled && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      onClick={onToggle}
    >
      Always show dims
    </Button>
  );
};
