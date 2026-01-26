import * as React from "react";
import { createRoot } from "react-dom/client";
import { ensureCustomToolsStore } from "../../lib/custom-tools-store";
import { CustomToolsEditor } from "./custom-tools-editor";
import "./style.css";

ensureCustomToolsStore();

const container = document.getElementById("root");
if (!container) {
  console.warn("[wilderness] Missing root element for custom tools editor.");
} else {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <CustomToolsEditor />
    </React.StrictMode>
  );
}
