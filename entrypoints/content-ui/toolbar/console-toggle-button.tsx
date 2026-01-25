import * as React from "react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { TOGGLE_CONSOLE_EVENT } from "../../../lib/events";

type ConsoleToggleButtonProps = {
  isOpen: boolean;
  count: number;
};

export const ConsoleToggleButton = ({
  isOpen,
  count,
}: ConsoleToggleButtonProps) => {
  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent(TOGGLE_CONSOLE_EVENT));
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleToggle}
      aria-pressed={isOpen}
      aria-label="Toggle console panel"
      className={cn(
        isOpen && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      {isOpen ? "Close Console" : "Console"}
      {count > 0 ? (
        <span className="ml-1 rounded bg-muted px-1 text-xs text-muted-foreground">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Button>
  );
};
