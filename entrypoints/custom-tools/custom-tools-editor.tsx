import MonacoEditor, { loader, type Monaco } from "@monaco-editor/react";
import * as prettierBabel from "prettier/plugins/babel";
import * as prettierEstree from "prettier/plugins/estree";
import * as prettier from "prettier/standalone";
import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { openChromeExtensionsSettingsForCurrentExtension } from "../../lib/custom-tools/permissions";
import {
  addCustomTool,
  type CustomTool,
  type CustomToolMode,
  toggleActiveCustomToolId,
  updateCustomTool,
  useCustomToolsStore,
} from "../../lib/custom-tools/store";
import { cn } from "../../lib/utils";
import { useUserScriptsPermission } from "./use-user-scripts-permission";
import { UserScriptsPermissionBanner } from "./user-scripts-permission-banner";
import "monaco-editor/min/vs/editor/editor.main.css";

type ValidationState = {
  status: "idle" | "valid" | "error";
  message: string;
};

const TOOL_API_TYPES = `
declare function defineTool(tool: {
  setup(context: { beforePageLoad: boolean }): void | Promise<void>;
  cleanup(): void | Promise<void>;
}): {
  setup(context: { beforePageLoad: boolean }): void | Promise<void>;
  cleanup(): void | Promise<void>;
};
`;
const DEFAULT_MODE: CustomToolMode = "on-enable";
const DEFAULT_CODE = `const ROOT_ID = "my-custom-tool-root";

defineTool({
  setup({ beforePageLoad }) {
    document.getElementById(ROOT_ID)?.remove();

    const badge = document.createElement("div");
    badge.id = ROOT_ID;
    badge.textContent = beforePageLoad ? "[SETUP:EARLY]" : "[SETUP:LATE]";
    badge.style.position = "fixed";
    badge.style.right = "16px";
    badge.style.bottom = "16px";
    badge.style.zIndex = "2147483645";
    badge.style.padding = "4px 6px";
    badge.style.border = "1px solid rgba(255, 255, 255, 0.15)";
    badge.style.background = "rgba(0, 0, 0, 0.88)";
    badge.style.color = "#00ff88";
    badge.style.fontFamily = "'Courier New', Courier, monospace";
    badge.style.fontSize = "11px";
    badge.style.lineHeight = "1";
    badge.style.pointerEvents = "none";

    (document.body ?? document.documentElement)?.append(badge);
  },

  cleanup() {
    document.getElementById(ROOT_ID)?.remove();
  },
});
`;
const PRETTIER_PLUGINS = [prettierBabel, prettierEstree];
const HUD_BUTTON_CLASS_NAME =
  "h-7 rounded-none border-0 bg-transparent px-2 font-mono text-[11px] font-normal tracking-[0.02em] text-[#e0e0e0] transition-none hover:bg-white/10 hover:text-white";
const HUD_ACTIVE_BUTTON_CLASS_NAME = "text-[#00ff88] hover:text-[#33ffaa]";
const HUD_INPUT_CLASS_NAME =
  "h-8 rounded-none border-white/15 bg-transparent px-2 font-mono text-[11px] tracking-[0.02em] text-[#e0e0e0] shadow-none placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-white/25";
const HUD_PANEL_CLASS_NAME = "border border-white/15 bg-black/85";
const MODE_LABELS: Record<CustomToolMode, string> = {
  "on-enable": "[ON ENABLE]",
  "on-extension-load": "[ON EXTENSION LOAD]",
};
let didRegisterToolApiTypes = false;

const monacoBaseUrl = browser.runtime.getURL("/custom-tools.html").replace("custom-tools.html", "monaco/vs");
loader.config({ paths: { vs: monacoBaseUrl } });

const getIdleMessage = (tool?: CustomTool | null) => (tool ? `Editing "${tool.name}".` : "Creating a new custom tool.");

export const CustomToolsEditor = () => {
  const { firefoxBuild, permissionState, requestPermission, showPermissionWarning, missingPermissionMessage } =
    useUserScriptsPermission();
  const tools = useCustomToolsStore((state) => state.tools);
  const activeToolIds = useCustomToolsStore((state) => state.activeToolIds);
  const status = useCustomToolsStore((state) => state.status);
  const activeToolSet = React.useMemo(() => new Set(activeToolIds), [activeToolIds]);
  const [selectedToolId, setSelectedToolId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState(DEFAULT_CODE);
  const [mode, setMode] = React.useState<CustomToolMode>(DEFAULT_MODE);
  const [validation, setValidation] = React.useState<ValidationState>({
    status: "idle",
    message: getIdleMessage(),
  });

  const applyDraft = React.useCallback((tool: CustomTool | null) => {
    if (!tool) {
      setSelectedToolId(null);
      setName("");
      setCode(DEFAULT_CODE);
      setMode(DEFAULT_MODE);
      setValidation({ status: "idle", message: getIdleMessage() });
      return;
    }

    setSelectedToolId(tool.id);
    setName(tool.name);
    setCode(tool.code);
    setMode(tool.mode);
    setValidation({ status: "idle", message: getIdleMessage(tool) });
  }, []);

  React.useEffect(() => {
    if (!selectedToolId) {
      return;
    }

    const tool = tools.find((item) => item.id === selectedToolId);
    if (!tool) {
      applyDraft(null);
    }
  }, [applyDraft, selectedToolId, tools]);

  const requestFirefoxPermissionFromEditor = async () => {
    return await requestPermission();
  };

  const handleEditorMount = (_editor: unknown, monaco: Monaco) => {
    if (!didRegisterToolApiTypes) {
      monaco.languages.typescript.javascriptDefaults.addExtraLib(TOOL_API_TYPES, "file:///wilderness/custom-tool-api.d.ts");
      didRegisterToolApiTypes = true;
    }

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
    });
  };

  const handleFormat = async () => {
    try {
      const formatted = await prettier.format(code, {
        parser: "babel",
        plugins: PRETTIER_PLUGINS,
        semi: true,
        singleQuote: false,
        trailingComma: "es5",
      });
      setCode(formatted);
      setValidation({ status: "valid", message: "Formatted successfully." });
    } catch (error) {
      console.warn("[wilderness] Failed to format custom tool.", error);
      setValidation({ status: "error", message: "Formatting failed. Check syntax." });
    }
  };

  const validateCodeSyntax = async () => {
    await prettier.format(code, {
      parser: "babel",
      plugins: PRETTIER_PLUGINS,
    });
  };

  const handleValidate = async () => {
    try {
      await validateCodeSyntax();
      setValidation({ status: "valid", message: "No validation issues detected." });
    } catch (error) {
      console.warn("[wilderness] Custom tool validation failed.", error);
      const message = error instanceof Error ? error.message : "Validation failed.";
      setValidation({ status: "error", message });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setValidation({ status: "error", message: "Add a name for your custom tool." });
      return;
    }

    if (!code.trim()) {
      setValidation({ status: "error", message: "Add code before saving." });
      return;
    }

    try {
      await validateCodeSyntax();
    } catch (error) {
      console.warn("[wilderness] Custom tool validation failed during save.", error);
      const message = error instanceof Error ? error.message : "Validation failed.";
      setValidation({ status: "error", message });
      return;
    }

    try {
      if (selectedToolId) {
        const updatedTool = await updateCustomTool({ id: selectedToolId, name, code, mode });
        if (!updatedTool) {
          setValidation({ status: "error", message: "Unable to find that tool anymore." });
          return;
        }

        applyDraft(updatedTool);
        setValidation({
          status: "valid",
          message: activeToolSet.has(updatedTool.id)
            ? `Saved "${updatedTool.name}". Active pages will rerun setup with the new code.`
            : `Saved "${updatedTool.name}".`,
        });
        return;
      }

      const tool = await addCustomTool({ name, code, mode });
      if (permissionState !== "granted") {
        applyDraft(tool);
        if (firefoxBuild) {
          const granted = await requestFirefoxPermissionFromEditor();
          setValidation({
            status: granted ? "valid" : "error",
            message: granted
              ? `Saved "${tool.name}". Firefox permission granted and the tool is ready to enable.`
              : `Saved "${tool.name}". Grant the Firefox custom tool permission before enabling it.`,
          });
          if (!granted) {
            return;
          }
        } else {
          setValidation({
            status: "error",
            message: `Saved "${tool.name}". ${missingPermissionMessage}`,
          });
          return;
        }
      }

      await toggleActiveCustomToolId(tool.id, true);
      applyDraft(tool);
      setValidation({
        status: "valid",
        message:
          tool.mode === "on-enable"
            ? `Saved "${tool.name}". It is active for this page session only.`
            : `Saved "${tool.name}". It stays active whenever the extension loads on a page.`,
      });
    } catch (error) {
      console.warn("[wilderness] Unable to save custom tool.", error);
      setValidation({ status: "error", message: "Failed to save tool." });
    }
  };

  const handleGrantPermission = async () => {
    if (!firefoxBuild) {
      const opened = await openChromeExtensionsSettingsForCurrentExtension();
      setValidation({
        status: opened ? "valid" : "error",
        message: opened
          ? "Opened chrome://extensions for Wilderness. Enable Allow User Scripts, then return and enable the tool again."
          : "Unable to open chrome://extensions automatically. Open chrome://extensions, select Wilderness, and enable Allow User Scripts.",
      });
      return;
    }

    const granted = await requestFirefoxPermissionFromEditor();
    setValidation({
      status: granted ? "valid" : "error",
      message: granted
        ? "Firefox custom tool permission granted. Return to the page and enable the tool again."
        : "Firefox custom tool permission was not granted.",
    });
  };

  const handleClose = () => {
    window.close();
  };

  const selectedTool = selectedToolId ? (tools.find((tool) => tool.id === selectedToolId) ?? null) : null;
  const validationToneClassName =
    validation.status === "error" ? "text-[#fca5a5]" : validation.status === "valid" ? "text-[#00ff88]" : "text-white/65";
  const editorStatusLabel = selectedTool ? "[EDIT TOOL]" : "[NEW TOOL]";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[rgba(0,0,0,0.94)] font-mono text-[#e0e0e0]">
      <header className={cn(HUD_PANEL_CLASS_NAME, "m-4 mb-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="text-[10px] uppercase tracking-[0.08em] text-white/55">[CUSTOM TOOLS / EDITOR]</div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.02em]">
            <span className="text-[#00ff88]">{editorStatusLabel}</span>
            {selectedTool ? <span className="truncate text-white/65">[{selectedTool.name}]</span> : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] tracking-[0.02em]">
            <span className="shrink-0 text-white/55">[NAME]</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="custom tool name"
              className={cn(HUD_INPUT_CLASS_NAME, "w-full max-w-md")}
              aria-label="Custom tool name"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applyDraft(null)}
            aria-label="Create new tool"
            className={HUD_BUTTON_CLASS_NAME}
          >
            [NEW TOOL]
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFormat}
            aria-label="Format tool code"
            className={HUD_BUTTON_CLASS_NAME}
          >
            [FORMAT]
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleValidate}
            aria-label="Validate tool code"
            className={HUD_BUTTON_CLASS_NAME}
          >
            [VALIDATE]
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClose}
            aria-label="Close custom tools editor"
            className={HUD_BUTTON_CLASS_NAME}
          >
            [CLOSE]
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            aria-label={selectedTool ? "Save custom tool changes" : "Save new custom tool"}
            className={cn(HUD_BUTTON_CLASS_NAME, HUD_ACTIVE_BUTTON_CLASS_NAME)}
          >
            {selectedTool ? "[SAVE CHANGES]" : "[SAVE NEW TOOL]"}
          </Button>
        </div>
      </header>

      {showPermissionWarning ? (
        <UserScriptsPermissionBanner
          permissionState={permissionState}
          message={missingPermissionMessage}
          onGrantPermission={handleGrantPermission}
          firefoxBuild={firefoxBuild}
        />
      ) : null}

      <section className={cn(HUD_PANEL_CLASS_NAME, "mx-4 mt-4 px-4 py-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.08em] text-white/55">[CUSTOM TOOL LIST]</div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-white/45">
            {status === "loading" ? "[LOADING]" : `[${tools.length} TOOLS]`}
          </div>
        </div>

        {status === "loading" ? (
          <div className="mt-3 text-[11px] tracking-[0.02em] text-white/55">Loading custom tools…</div>
        ) : tools.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => {
              const isEditing = selectedToolId === tool.id;
              const isActive = activeToolSet.has(tool.id);
              return (
                <div
                  key={tool.id}
                  className={cn(
                    HUD_PANEL_CLASS_NAME,
                    "flex min-w-0 items-start justify-between gap-3 px-3 py-3",
                    isEditing && "border-[#00ff88]/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] tracking-[0.02em] text-[#e0e0e0]">{tool.name}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.08em]">
                      <span className="text-white/45">{MODE_LABELS[tool.mode]}</span>
                      {isActive ? <span className="text-[#00ff88]">[ACTIVE]</span> : null}
                      {isEditing ? <span className="text-[#00ff88]">[EDITING]</span> : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyDraft(tool)}
                    aria-label={`Edit ${tool.name}`}
                    className={cn(HUD_BUTTON_CLASS_NAME, isEditing && HUD_ACTIVE_BUTTON_CLASS_NAME)}
                  >
                    {isEditing ? "[EDITING]" : "[EDIT]"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-[11px] tracking-[0.02em] text-white/55">[NO CUSTOM TOOLS YET] Create one below.</div>
        )}
      </section>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className={cn(HUD_PANEL_CLASS_NAME, "flex min-h-0 min-w-0 flex-1 flex-col")}>
          <div className="border-b border-white/15 px-4 py-3 text-[11px] tracking-[0.02em]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white/55">[RUN MODE]</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMode("on-enable")}
                aria-pressed={mode === "on-enable"}
                className={cn(HUD_BUTTON_CLASS_NAME, mode === "on-enable" && HUD_ACTIVE_BUTTON_CLASS_NAME)}
              >
                [ON ENABLE]
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMode("on-extension-load")}
                aria-pressed={mode === "on-extension-load"}
                className={cn(HUD_BUTTON_CLASS_NAME, mode === "on-extension-load" && HUD_ACTIVE_BUTTON_CLASS_NAME)}
              >
                [ON EXTENSION LOAD]
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.08em] text-white/45">
              <span>[SETUP TIMING]</span>
              <span className="normal-case tracking-[0.02em] text-white/65">
                `beforePageLoad` is `true` while the document is still loading, otherwise `false`.
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 border-b border-white/15 p-3">
            <MonacoEditor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value: string | undefined) => setCode(value ?? "")}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: 12,
                lineHeight: 18,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 10 },
              }}
            />
          </div>

          <div className="px-4 py-3 text-[11px] tracking-[0.02em]" aria-live="polite">
            <span className="text-white/55">[STATUS]</span> <span className={validationToneClassName}>{validation.message}</span>
          </div>
        </div>

        <aside className={cn(HUD_PANEL_CLASS_NAME, "flex w-[380px] min-w-[340px] flex-col overflow-auto")}>
          <section className="border-b border-white/15 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-white/55">[FLOW]</div>
            <div className="mt-2 space-y-2 text-[11px] leading-5 tracking-[0.02em] text-white/70">
              <p>
                Use <span className="text-[#00ff88]">[NEW TOOL]</span> to start a blank draft.
              </p>
              <p>
                The list above shows every saved custom tool. Click <span className="text-[#00ff88]">[EDIT]</span> on one to load
                it below.
              </p>
              <p>Saving changes updates that tool in place instead of creating a duplicate.</p>
            </div>
          </section>

          <section className="border-b border-white/15 px-4 py-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-white/55">[API]</div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-[#00ff88]">{`defineTool({
  setup({ beforePageLoad }) {},
  cleanup() {},
});`}</pre>
          </section>

          <section className="border-b border-white/15 px-4 py-4 text-[11px] leading-5 tracking-[0.02em]">
            <div className="text-[10px] uppercase tracking-[0.08em] text-white/55">[ON ENABLE]</div>
            <p className="mt-2 text-white/70">
              Runs <span className="text-[#00ff88]">setup</span> once when you turn it on for the current page session.
            </p>
            <p className="mt-2 text-white/70">
              It is cleared on page navigation or extension restart, so it will not come back automatically.
            </p>
          </section>

          <section className="border-b border-white/15 px-4 py-4 text-[11px] leading-5 tracking-[0.02em]">
            <div className="text-[10px] uppercase tracking-[0.08em] text-white/55">[ON EXTENSION LOAD]</div>
            <p className="mt-2 text-white/70">
              Stays active in storage and reruns <span className="text-[#00ff88]">setup</span> whenever the extension loads on a
              page.
            </p>
            <p className="mt-2 text-white/70">
              Use this for overlays or helpers that should stay on across page reloads and extension restarts.
            </p>
          </section>

          <section className="px-4 py-4 text-[11px] leading-5 tracking-[0.02em]">
            <div className="text-[10px] uppercase tracking-[0.08em] text-white/55">[CLEANUP]</div>
            <p className="mt-2 text-white/70">
              The extension calls <span className="text-[#00ff88]">cleanup</span> when a tool turns off and before setup reruns,
              so anything you append to the page should be removable from there.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};
