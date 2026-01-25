import { Download, Search, Trash2, X } from "lucide-react";
import * as React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ScrollArea } from "../../../components/ui/scroll-area";
import {
  type ConsoleEntry,
  clearConsoleEntries,
  downloadConsoleLogs,
  formatArg,
  getConsoleEntries,
  subscribeConsoleStore,
} from "../../../lib/console-store";
import { cn } from "../../../lib/utils";

type ConsolePanelProps = {
  onClose: () => void;
};

export function ConsolePanel({ onClose }: ConsolePanelProps) {
  const entries = React.useSyncExternalStore(subscribeConsoleStore, getConsoleEntries);
  const [filter, setFilter] = React.useState("");
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const autoScrollRef = React.useRef(true);

  const filteredEntries = React.useMemo(() => {
    if (!filter) {
      return entries;
    }
    const lowerFilter = filter.toLowerCase();
    return entries.filter((entry) =>
      entry.args.some((arg) => {
        const str = formatArg(arg).toLowerCase();
        return str.includes(lowerFilter);
      })
    );
  }, [entries, filter]);

  const handleViewportScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 4;
    autoScrollRef.current = isAtBottom;
  }, []);

  // Auto-scroll to bottom when new entries arrive unless user paused it.
  React.useLayoutEffect(() => {
    if (!autoScrollRef.current) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [entries.length]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[2147483647] flex h-[300px] flex-col border-t border-neutral-200 bg-white text-neutral-950 shadow-2xl transition-transform duration-300 ease-in-out animate-in slide-in-from-bottom">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 p-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-neutral-900">Console</h2>
          <Badge variant="secondary" className="h-5 bg-neutral-200 px-1.5 text-[10px] text-neutral-700 hover:bg-neutral-300">
            {entries.length}
          </Badge>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              aria-label="Filter console logs"
              className="h-7 border-neutral-300 bg-white pl-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            onClick={downloadConsoleLogs}
            title="Download logs"
            aria-label="Download console logs"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            onClick={clearConsoleEntries}
            title="Clear console"
            aria-label="Clear console logs"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <div className="mx-1 h-4 w-px bg-neutral-200" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            onClick={onClose}
            title="Close panel"
            aria-label="Close console panel"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-white" viewportRef={viewportRef} onViewportScroll={handleViewportScroll}>
        <div className="flex flex-col p-2 font-mono text-xs" role="log">
          {filteredEntries.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-neutral-400 italic">
              {filter ? "No matching logs found" : "No console logs captured yet"}
            </div>
          ) : (
            filteredEntries.map((entry) => <ConsoleEntryRow key={entry.id} entry={entry} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ConsoleEntryRow({ entry }: { entry: ConsoleEntry }) {
  const methodColor = {
    log: "text-neutral-700",
    info: "text-blue-600",
    warn: "text-yellow-600",
    error: "text-red-600",
    debug: "text-neutral-500",
  }[entry.method];

  const bgClass = {
    log: "hover:bg-neutral-50",
    info: "bg-blue-50/50 hover:bg-blue-50",
    warn: "bg-yellow-50/50 hover:bg-yellow-50",
    error: "bg-red-50/50 hover:bg-red-50",
    debug: "hover:bg-neutral-50",
  }[entry.method];

  return (
    <div className={cn("flex items-start gap-2 rounded-sm border-b border-neutral-100 px-2 py-1.5 last:border-0", bgClass)}>
      <span className="w-16 shrink-0 select-none text-[10px] text-neutral-400">
        {new Date(entry.timestamp).toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
      <span className={cn("w-10 shrink-0 text-[10px] font-semibold uppercase", methodColor)}>{entry.method}</span>
      <div className="flex-1 break-words whitespace-pre-wrap text-neutral-800">
        {entry.args.map((arg, i) => (
          <span key={i} className="mr-2">
            {formatArg(arg)}
          </span>
        ))}
      </div>
    </div>
  );
}
