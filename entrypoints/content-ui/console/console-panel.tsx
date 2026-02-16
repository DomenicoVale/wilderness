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
  // biome-ignore lint/correctness/useExhaustiveDependencies: entries.length is intentional to trigger scroll on new entries
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
    <div className="fixed inset-x-4 bottom-4 z-[2147483647] flex h-[340px] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 text-slate-100 shadow-[0_32px_88px_-44px_rgba(2,6,23,0.98)] transition-transform duration-300 ease-in-out animate-in slide-in-from-bottom">
      <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800/90 p-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-100">Console</h2>
          <Badge
            variant="secondary"
            className="h-5 rounded-full border border-slate-600 bg-slate-800 px-2 text-[10px] text-slate-300"
          >
            {entries.length}
          </Badge>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              aria-label="Filter console logs"
              className="h-8 border-slate-700 bg-slate-900/80 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500/70"
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={downloadConsoleLogs}
            title="Download logs"
            aria-label="Download console logs"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={clearConsoleEntries}
            title="Clear console"
            aria-label="Clear console logs"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="mx-1 h-4 w-px bg-slate-700" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            onClick={onClose}
            title="Close panel"
            aria-label="Close console panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-slate-950" viewportRef={viewportRef} onViewportScroll={handleViewportScroll}>
        <div className="flex flex-col p-2 font-mono text-xs" role="log">
          {filteredEntries.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-slate-500 italic">
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
    log: "text-slate-300",
    info: "text-sky-300",
    warn: "text-amber-300",
    error: "text-rose-300",
    debug: "text-slate-500",
  }[entry.method];

  const bgClass = {
    log: "hover:bg-slate-900/70",
    info: "bg-sky-500/5 hover:bg-sky-500/10",
    warn: "bg-amber-500/5 hover:bg-amber-500/10",
    error: "bg-rose-500/5 hover:bg-rose-500/10",
    debug: "hover:bg-slate-900/70",
  }[entry.method];

  return (
    <div className={cn("flex items-start gap-2 rounded-lg border-b border-slate-800 px-2 py-1.5 last:border-0", bgClass)}>
      <span className="w-16 shrink-0 select-none text-[10px] text-slate-500">
        {new Date(entry.timestamp).toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
      <span className={cn("w-10 shrink-0 text-[10px] font-semibold uppercase", methodColor)}>{entry.method}</span>
      <div className="flex-1 break-words whitespace-pre-wrap text-slate-200">
        {entry.args.map((arg, i) => (
          <span key={i} className="mr-2">
            {formatArg(arg)}
          </span>
        ))}
      </div>
    </div>
  );
}
