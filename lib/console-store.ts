/**
 * Console Store
 *
 * A pub/sub store for console entries that works with React's useSyncExternalStore.
 * Provides utilities for storing, clearing, and downloading console logs.
 */

export type SerializedArg =
  | { type: "string"; value: string }
  | { type: "number"; value: string }
  | { type: "boolean"; value: string }
  | { type: "null"; value: string }
  | { type: "undefined"; value: string }
  | { type: "bigint"; value: string }
  | { type: "symbol"; value: string }
  | { type: "object"; value: string; preview: string }
  | { type: "array"; value: string; preview: string }
  | { type: "function"; name: string }
  | { type: "element"; tagName: string; id?: string; className?: string }
  | { type: "node"; value: string }
  | { type: "error"; message: string; stack?: string }
  | { type: "circular"; value: string }
  | { type: "unknown"; value: string };

export type ConsoleMethod = "log" | "info" | "warn" | "error" | "debug";

export type ConsoleEntry = {
  id: string;
  method: ConsoleMethod;
  args: SerializedArg[];
  timestamp: number;
  isUncaught?: boolean;
  isUnhandledRejection?: boolean;
};

export type ConsoleMessageData = {
  source: string;
  method: ConsoleMethod;
  args: SerializedArg[];
  timestamp: number;
  isUncaught?: boolean;
  isUnhandledRejection?: boolean;
};

const CONSOLE_MESSAGE_SOURCE = "wilderness-console";
const MAX_ENTRIES = 1000;

type Listener = () => void;

let entries: ConsoleEntry[] = [];
let entryIdCounter = 0;

const listeners = new Set<Listener>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

/**
 * Validates that a message is from our console interceptor.
 */
export const isConsoleMessage = (data: unknown): data is ConsoleMessageData => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const msg = data as Record<string, unknown>;

  return (
    msg.source === CONSOLE_MESSAGE_SOURCE &&
    typeof msg.method === "string" &&
    Array.isArray(msg.args) &&
    typeof msg.timestamp === "number"
  );
};

/**
 * Adds a new console entry to the store.
 */
export const addConsoleEntry = (data: ConsoleMessageData) => {
  const entry: ConsoleEntry = {
    id: `console-${entryIdCounter++}`,
    method: data.method,
    args: data.args,
    timestamp: data.timestamp,
    isUncaught: data.isUncaught,
    isUnhandledRejection: data.isUnhandledRejection,
  };

  entries = [...entries, entry];

  // Cap entries to prevent memory issues
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(-MAX_ENTRIES);
  }

  notifyListeners();
};

/**
 * Returns all console entries.
 */
export const getConsoleEntries = (): ConsoleEntry[] => entries;

/**
 * Returns the count of console entries.
 */
export const getConsoleCount = (): number => entries.length;

/**
 * Clears all console entries.
 */
export const clearConsoleEntries = () => {
  entries = [];
  notifyListeners();
};

/**
 * Subscribes to console store changes.
 * Returns an unsubscribe function.
 */
export const subscribeConsoleStore = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Formats a serialized argument for display.
 */
export const formatArg = (arg: SerializedArg): string => {
  switch (arg.type) {
    case "string":
      return `"${arg.value}"`;
    case "number":
    case "boolean":
    case "null":
    case "undefined":
    case "bigint":
    case "symbol":
      return arg.value;
    case "object":
    case "array":
      return arg.preview ?? arg.value;
    case "function":
      return `ƒ ${arg.name}()`;
    case "element": {
      let display = `<${arg.tagName}`;
      if (arg.id) {
        display += `#${arg.id}`;
      }
      if (arg.className) {
        display += `.${arg.className.split(" ").join(".")}`;
      }
      display += ">";
      return display;
    }
    case "node":
      return `[Node: ${arg.value}]`;
    case "error":
      return arg.stack ? `${arg.message}\n${arg.stack}` : arg.message;
    case "circular":
      return arg.value;
    case "unknown":
      return arg.value;
    default:
      return "[Unknown]";
  }
};

/**
 * Downloads all console entries as a JSON file.
 */
export const downloadConsoleLogs = () => {
  const data = {
    exportedAt: new Date().toISOString(),
    url: window.location.href,
    entries: entries.map((entry) => ({
      ...entry,
      formattedArgs: entry.args.map(formatArg),
      formattedTime: new Date(entry.timestamp).toISOString(),
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `wilderness-console-${timestamp}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};
