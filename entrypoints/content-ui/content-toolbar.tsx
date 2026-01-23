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

const MENU_ITEMS = [
  { label: "Inspect styles", value: "inspect" },
  { label: "Capture colors", value: "colors" },
  { label: "Log DOM info", value: "dom-info" },
] as const;

const handleAlert = () => {
  window.alert("Wilderness: sample action triggered.");
};

export function ContentToolbar() {
  const [guidesEnabled, setGuidesEnabled] = React.useState(false);

  const handleGuidesToggle = () => {
    setGuidesEnabled((prev) => {
      const next = !prev;
      window.dispatchEvent(
        new CustomEvent("wilderness:toggle-guides", {
          detail: { enabled: next },
        }),
      );
      return next;
    });
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[2147483647] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleGuidesToggle}
          aria-pressed={guidesEnabled}
          aria-label="Toggle guides ruler"
          className={cn(
            guidesEnabled &&
              "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          Guides
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" aria-label="Open tools menu">
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

        <p className="text-sm text-muted-foreground">Welcome to Wilderness.</p>

        <Button size="sm" onClick={handleAlert} aria-label="Show sample alert">
          Try alert
        </Button>
      </div>
    </div>
  );
}
