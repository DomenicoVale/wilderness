(() => {
  // Keep these protocol constants aligned with lib/custom-tools/bridge.ts.
  const BRIDGE_KEY = "__wildernessCustomToolBridge__";
  if (globalThis[BRIDGE_KEY]) {
    return;
  }
  globalThis[BRIDGE_KEY] = true;

  const RUNTIME_KEY = "__wildernessCustomToolRuntime__";
  const COMMAND_EVENT = "wilderness:custom-tool-command";
  const RESULT_EVENT = "wilderness:custom-tool-result";
  const READY_ATTRIBUTE = "data-wilderness-custom-tool-bridge";
  const READY_VALUE = "ready";
  const existingRegistry = globalThis[RUNTIME_KEY];
  const registry = existingRegistry || Object.create(null);
  if (!existingRegistry) {
    globalThis[RUNTIME_KEY] = registry;
  }

  const getErrorMessage = (error) => {
    if (error instanceof Error && typeof error.message === "string") {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "Unknown execution failure.";
  };

  const toSourceLabel = (toolName) => toolName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48) || "custom_tool";

  const markReady = () => {
    const root = document.documentElement;
    if (!root) {
      return false;
    }

    root.setAttribute(READY_ATTRIBUTE, READY_VALUE);
    return true;
  };

  if (!markReady()) {
    const observer = new MutationObserver(() => {
      if (!markReady()) {
        return;
      }

      observer.disconnect();
    });
    observer.observe(document, {
      childList: true,
      subtree: true,
    });
  }

  const dispatchResult = (requestId, result) => {
    document.dispatchEvent(
      new CustomEvent(RESULT_EVENT, {
        detail: JSON.stringify({
          requestId,
          ok: Boolean(result.ok),
          error: result.error,
        }),
      })
    );
  };

  const cleanupTool = async (toolId, warningPrefix) => {
    const currentEntry = registry[toolId];
    if (currentEntry && typeof currentEntry.cleanup === "function") {
      try {
        await currentEntry.cleanup();
      } catch (error) {
        console.warn(warningPrefix, error);
      }
    }

    delete registry[toolId];
  };

  const runSetup = async (tool) => {
    if (typeof tool.code !== "string") {
      return { ok: false, error: "Missing custom tool setup code." };
    }

    await cleanupTool(tool.id, "[wilderness] Failed to cleanup custom tool before setup.");

    let definedTool;
    const defineTool = (definition) => {
      definedTool = definition;
      return definition;
    };

    const sourceLabel = `wilderness-custom-tool-${toSourceLabel(tool.name)}.js`;

    let returnedTool;
    try {
      returnedTool = new Function("defineTool", `"use strict";\n${tool.code}\n//# sourceURL=${sourceLabel}`)(defineTool);
    } catch (error) {
      return {
        ok: false,
        error: getErrorMessage(error),
      };
    }

    const toolDefinition = definedTool ?? returnedTool;
    if (toolDefinition != null && (typeof toolDefinition !== "object" || Array.isArray(toolDefinition))) {
      return { ok: false, error: "Custom tools must call defineTool({ setup, cleanup })." };
    }

    if (toolDefinition && typeof toolDefinition.setup !== "function") {
      return { ok: false, error: "Custom tool definition is missing setup({ beforePageLoad })." };
    }

    registry[tool.id] = {
      cleanup:
        toolDefinition && typeof toolDefinition.cleanup === "function" ? toolDefinition.cleanup.bind(toolDefinition) : undefined,
    };

    if (toolDefinition && typeof toolDefinition.setup === "function") {
      try {
        await toolDefinition.setup.call(toolDefinition, {
          beforePageLoad: document.readyState === "loading",
        });
      } catch (error) {
        return {
          ok: false,
          error: getErrorMessage(error),
        };
      }
    }

    return { ok: true };
  };

  const runCleanup = async (tool) => {
    await cleanupTool(tool.id, "[wilderness] Failed to cleanup custom tool.");
    return { ok: true };
  };

  document.addEventListener(COMMAND_EVENT, (event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail !== "string") {
      return;
    }

    let payload;
    try {
      payload = JSON.parse(event.detail);
    } catch (error) {
      console.warn("[wilderness] Failed to parse custom tool bridge request.", error);
      return;
    }

    if (!payload || typeof payload.requestId !== "string" || !payload.tool || typeof payload.action !== "string") {
      console.warn("[wilderness] Invalid custom tool bridge request.");
      return;
    }

    const runner = payload.action === "cleanup" ? runCleanup : runSetup;

    void runner(payload.tool)
      .then((result) => {
        dispatchResult(payload.requestId, result);
      })
      .catch((error) => {
        dispatchResult(payload.requestId, {
          ok: false,
          error: getErrorMessage(error),
        });
      });
  });
})();
