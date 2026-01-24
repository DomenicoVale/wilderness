/**
 * Console Interceptor - MAIN World Script
 *
 * Hooks all console methods and forwards logs to the content script.
 * This file is injected into the MAIN world via chrome.scripting API.
 */
(function () {
  // Prevent double injection
  if (window.__wildernessConsoleInterceptorInstalled) {
    return;
  }
  window.__wildernessConsoleInterceptorInstalled = true;

  const CONSOLE_MESSAGE_SOURCE = "wilderness-console";
  const METHODS = ["log", "info", "warn", "error", "debug"];

  // Store original console methods immediately
  const originalMethods = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  /**
   * Safely serializes a value for transmission via postMessage.
   */
  function serializeArg(arg, seen) {
    if (!seen) seen = new WeakSet();

    if (arg === null) return { type: "null", value: "null" };
    if (arg === undefined) return { type: "undefined", value: "undefined" };
    if (typeof arg === "string") return { type: "string", value: arg };
    if (typeof arg === "number") return { type: "number", value: String(arg) };
    if (typeof arg === "boolean")
      return { type: "boolean", value: String(arg) };
    if (typeof arg === "bigint") return { type: "bigint", value: arg + "n" };
    if (typeof arg === "symbol")
      return { type: "symbol", value: arg.toString() };
    if (typeof arg === "function")
      return { type: "function", name: arg.name || "(anonymous)" };

    if (arg instanceof Error) {
      return { type: "error", message: arg.message, stack: arg.stack };
    }

    if (arg instanceof Element) {
      return {
        type: "element",
        tagName: arg.tagName.toLowerCase(),
        id: arg.id || undefined,
        className: arg.className || undefined,
      };
    }

    if (arg instanceof Node) {
      return { type: "node", value: arg.nodeName };
    }

    if (typeof arg === "object") {
      if (seen.has(arg)) {
        return { type: "circular", value: "[Circular Reference]" };
      }
      seen.add(arg);

      var isArray = Array.isArray(arg);
      var preview, fullValue;

      try {
        fullValue = JSON.stringify(
          arg,
          function (key, val) {
            if (typeof val === "function")
              return "[Function: " + (val.name || "anonymous") + "]";
            if (val instanceof Element)
              return "[Element: <" + val.tagName.toLowerCase() + ">]";
            if (val instanceof Node) return "[Node: " + val.nodeName + "]";
            if (typeof val === "bigint") return val + "n";
            if (typeof val === "symbol") return val.toString();
            return val;
          },
          2,
        );
        preview =
          fullValue.length > 100
            ? fullValue.substring(0, 100) + "..."
            : fullValue;
      } catch (e) {
        preview = isArray ? "[Array(" + arg.length + ")]" : "[Object]";
        fullValue = preview;
      }

      return {
        type: isArray ? "array" : "object",
        value: fullValue,
        preview: preview,
      };
    }

    return { type: "unknown", value: String(arg) };
  }

  /**
   * Creates an intercepted console method.
   */
  function createInterceptedMethod(method) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      var serializedArgs = args.map(function (arg) {
        return serializeArg(arg);
      });

      window.postMessage(
        {
          source: CONSOLE_MESSAGE_SOURCE,
          method: method,
          args: serializedArgs,
          timestamp: Date.now(),
        },
        "*",
      );

      return originalMethods[method].apply(console, args);
    };
  }

  // Hook all console methods
  METHODS.forEach(function (method) {
    console[method] = createInterceptedMethod(method);
  });

  // Capture uncaught errors
  window.addEventListener("error", function (event) {
    window.postMessage(
      {
        source: CONSOLE_MESSAGE_SOURCE,
        method: "error",
        args: [
          {
            type: "error",
            message: event.message,
            stack: event.filename + ":" + event.lineno + ":" + event.colno,
          },
        ],
        timestamp: Date.now(),
        isUncaught: true,
      },
      "*",
    );
  });

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    window.postMessage(
      {
        source: CONSOLE_MESSAGE_SOURCE,
        method: "error",
        args: [
          reason instanceof Error
            ? { type: "error", message: reason.message, stack: reason.stack }
            : serializeArg(reason),
        ],
        timestamp: Date.now(),
        isUnhandledRejection: true,
      },
      "*",
    );
  });
})();
