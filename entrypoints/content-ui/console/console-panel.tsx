import * as React from "react";
import {
  clearConsoleEntries,
  downloadConsoleLogs,
  formatArg,
  getConsoleEntries,
  subscribeConsoleStore,
} from "../../../lib/console-store";

type ConsolePanelProps = { onClose: () => void };

export function ConsolePanel({ onClose }: ConsolePanelProps) {
  const entries = React.useSyncExternalStore(subscribeConsoleStore, getConsoleEntries);
  const [filter, setFilter] = React.useState("");
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const autoScrollRef = React.useRef(true);

  const filteredEntries = React.useMemo(() => {
    if (!filter) return entries;
    const lf = filter.toLowerCase();
    return entries.filter((e) => e.args.some((a) => formatArg(a).toLowerCase().includes(lf)));
  }, [entries, filter]);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    autoScrollRef.current = t.scrollTop + t.clientHeight >= t.scrollHeight - 4;
  }, []);

  React.useLayoutEffect(() => {
    if (!autoScrollRef.current || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, []);

  const fmt = (t: number) =>
    new Date(t).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="wld-con">
      <div className="wld-con-header">
        <span className="wld-con-title">[CONSOLE({entries.length})]</span>
        <input
          className="wld-con-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter..."
          aria-label="Filter console logs"
        />
        <button type="button" className="wld-con-btn" onClick={downloadConsoleLogs} title="Download logs">
          [DL]
        </button>
        <button type="button" className="wld-con-btn" onClick={clearConsoleEntries} title="Clear">
          [CLR]
        </button>
        <button type="button" className="wld-con-btn" onClick={onClose} title="Close">
          [X]
        </button>
      </div>
      <div className="wld-con-body" ref={bodyRef} onScroll={handleScroll}>
        {filteredEntries.length === 0 ? (
          <div className="wld-con-empty">{filter ? "no matches" : "no logs yet"}</div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="wld-con-row" data-method={entry.method}>
              <span className="wld-con-time">{fmt(entry.timestamp)}</span>
              <span className="wld-con-method">[{entry.method.toUpperCase()}]</span>
              <span className="wld-con-msg">
                {entry.args.map((a, i) => (
                  <span key={i}>
                    {formatArg(a)}
                    {i < entry.args.length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
