import * as React from "react";
import {
  clearConsoleEntries,
  downloadConsoleLogs,
  formatArg,
  getConsoleEntries,
  subscribeConsoleStore,
} from "../../../lib/console-store";

const PANEL_STYLES = `
  .wld-con {
    position: fixed;
    bottom: 4px;
    left: 16px;
    right: 16px;
    height: 260px;
    background: rgba(0,0,0,0.88);
    border: 1px solid rgba(255,255,255,0.15);
    font-family: 'Courier New', Courier, monospace;
    font-size: 10px;
    color: #e0e0e0;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }
  .wld-con-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0;
  }
  .wld-con-title {
    color: #00ff88;
    white-space: nowrap;
  }
  .wld-con-filter {
    flex: 1;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    color: #e0e0e0;
    font-family: inherit;
    font-size: 10px;
    padding: 1px 4px;
    outline: none;
    min-width: 0;
  }
  .wld-con-filter::placeholder { color: rgba(255,255,255,0.25); }
  .wld-con-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 10px;
    color: #e0e0e0;
    padding: 1px 3px;
    white-space: nowrap;
  }
  .wld-con-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .wld-con-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .wld-con-body::-webkit-scrollbar { width: 4px; }
  .wld-con-body::-webkit-scrollbar-track { background: transparent; }
  .wld-con-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }
  .wld-con-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 1px 6px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    white-space: pre-wrap;
    word-break: break-all;
  }
  .wld-con-row:hover { background: rgba(255,255,255,0.04); }
  .wld-con-time { color: rgba(255,255,255,0.3); flex-shrink: 0; }
  .wld-con-method { flex-shrink: 0; font-weight: bold; }
  .wld-con-msg { flex: 1; min-width: 0; }
  .wld-con-row[data-method="log"] .wld-con-method { color: #e0e0e0; }
  .wld-con-row[data-method="info"] .wld-con-method, .wld-con-row[data-method="info"] .wld-con-msg { color: #38bdf8; }
  .wld-con-row[data-method="warn"] .wld-con-method, .wld-con-row[data-method="warn"] .wld-con-msg { color: #f59e0b; }
  .wld-con-row[data-method="error"] .wld-con-method, .wld-con-row[data-method="error"] .wld-con-msg { color: #ef4444; }
  .wld-con-row[data-method="debug"] .wld-con-method, .wld-con-row[data-method="debug"] .wld-con-msg { color: #64748b; }
  .wld-con-empty { padding: 16px; color: rgba(255,255,255,0.25); text-align: center; }
`;

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
  }, [entries.length]);

  const fmt = (t: number) =>
    new Date(t).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <>
      <style>{PANEL_STYLES}</style>
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
          <button className="wld-con-btn" onClick={downloadConsoleLogs} title="Download logs">
            [DL]
          </button>
          <button className="wld-con-btn" onClick={clearConsoleEntries} title="Clear">
            [CLR]
          </button>
          <button className="wld-con-btn" onClick={onClose} title="Close">
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
    </>
  );
}
