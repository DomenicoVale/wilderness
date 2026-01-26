import MonacoEditor, { loader, type Monaco } from "@monaco-editor/react";
import * as prettierBabel from "prettier/parser-babel";
import * as prettier from "prettier/standalone";
import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { addCustomTool, setActiveCustomToolId } from "../../lib/custom-tools-store";
import "monaco-editor/min/vs/editor/editor.main.css";

type ValidationState = {
  status: "idle" | "valid" | "error";
  message: string;
};

const DEFAULT_CODE = `// New custom tool
console.log("It works!");
`;

const monacoBaseUrl = browser.runtime.getURL("/custom-tools.html").replace("custom-tools.html", "monaco/vs");
loader.config({ paths: { vs: monacoBaseUrl } });

export const CustomToolsEditor = () => {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState(DEFAULT_CODE);
  const [mode, setMode] = React.useState<"on-enable" | "on-load">("on-enable");
  const [validation, setValidation] = React.useState<ValidationState>({
    status: "idle",
    message: "Ready to validate.",
  });

  const handleEditorMount = (_editor: unknown, monaco: Monaco) => {
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
        plugins: [prettierBabel],
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

  const handleValidate = () => {
    try {
      new Function(code);
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
      const tool = await addCustomTool({ name, code, mode });
      await setActiveCustomToolId(tool.id);
      window.close();
    } catch (error) {
      console.warn("[wilderness] Unable to save custom tool.", error);
      setValidation({ status: "error", message: "Failed to save tool." });
    }
  };

  const handleCancel = () => {
    window.close();
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Custom tool</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tool name"
              className="w-64"
              aria-label="Custom tool name"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleFormat} aria-label="Format tool code">
            Format
          </Button>
          <Button size="sm" variant="secondary" onClick={handleValidate} aria-label="Validate tool code">
            Validate
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} aria-label="Cancel">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} aria-label="Save custom tool">
            Save
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 flex-col border-r border-border">
          <div className="flex items-center gap-2 border-b border-border px-6 py-3">
            <span className="text-sm text-muted-foreground">Run mode</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={mode === "on-enable" ? "default" : "secondary"}
                onClick={() => setMode("on-enable")}
                aria-pressed={mode === "on-enable"}
              >
                Run once when enabled
              </Button>
              <Button
                size="sm"
                variant={mode === "on-load" ? "default" : "secondary"}
                onClick={() => setMode("on-load")}
                aria-pressed={mode === "on-load"}
              >
                Run on every page load
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 px-4 py-4">
            <MonacoEditor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value: string | undefined) => setCode(value ?? "")}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                tabSize: 2,
                wordWrap: "on",
              }}
            />
          </div>
          <div className="border-t border-border px-6 py-3 text-sm text-muted-foreground" aria-live="polite">
            {validation.message}
          </div>
        </div>
        <aside className="flex w-[30%] min-w-[280px] flex-col gap-2 px-6 py-6">
          <div className="text-sm font-semibold text-foreground">AI assistant</div>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </aside>
      </div>
    </div>
  );
};
