import $ from "jquery";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ScopedCssVariable } from "../core/types";
import { PANEL_VIEWPORT_GAP } from "../state/persistence";
import { collectScopedCssVariables } from "../utils/style";

type CreateVariablePopoverOptions = {
  root: HTMLElement;
  getCurrentTarget: () => Element | null;
  setStatusFeedback: (message: string, tone?: "success" | "error") => void;
};

type PopoverViewState = {
  visible: boolean;
  query: string;
  left: number;
  top: number;
  variables: ScopedCssVariable[];
};

export type VariablePopoverController = {
  appendVariableButton: (args: { field: HTMLDivElement; label: string; applyVariable: (nextValue: string) => void }) => void;
  hide: () => void;
  destroy: () => void;
};

/**
 * React-mounted variable picker used by imperative panel controls.
 * Controls remain imperative for editing performance, but the popover UI is
 * React-rendered for stateful conditional rendering and simpler behavior updates.
 */
export const createVariablePopover = ({
  root,
  getCurrentTarget,
  setStatusFeedback,
}: CreateVariablePopoverOptions): VariablePopoverController => {
  let anchor: HTMLElement | null = null;
  let applyVariable: ((nextValue: string) => void) | null = null;
  let setViewState: React.Dispatch<React.SetStateAction<PopoverViewState>> | null = null;

  const setPopoverState = (updater: React.SetStateAction<PopoverViewState>) => {
    setViewState?.(updater);
  };

  const hide = () => {
    anchor = null;
    applyVariable = null;
    setPopoverState((prev) => ({
      ...prev,
      visible: false,
      query: "",
      variables: [],
    }));
  };

  const host = document.createElement("div");
  root.append(host);
  const reactRoot = createRoot(host);

  const VariablePopover = () => {
    const [viewState, _setViewState] = useState<PopoverViewState>({
      visible: false,
      query: "",
      left: PANEL_VIEWPORT_GAP,
      top: PANEL_VIEWPORT_GAP,
      variables: [],
    });
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);

    setViewState = _setViewState;

    const filtered = useMemo(() => {
      const query = viewState.query.trim().toLowerCase();
      if (!query) {
        return viewState.variables;
      }
      return viewState.variables.filter(
        (entry) => entry.name.toLowerCase().includes(query) || entry.value.toLowerCase().includes(query)
      );
    }, [viewState.query, viewState.variables]);

    useEffect(() => {
      if (!viewState.visible) {
        return;
      }

      searchRef.current?.focus();
      searchRef.current?.select();

      const onPointerDown = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          hide();
          return;
        }
        if (popoverRef.current?.contains(target) || anchor?.contains(target)) {
          return;
        }
        hide();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") {
          return;
        }
        event.preventDefault();
        hide();
      };

      window.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("keydown", onKeyDown, true);
      return () => {
        window.removeEventListener("pointerdown", onPointerDown, true);
        window.removeEventListener("keydown", onKeyDown, true);
      };
    }, [viewState.visible]);

    return (
      <div
        ref={popoverRef}
        className="wilderness-inspect-var-popover"
        style={{
          display: viewState.visible ? "flex" : "none",
          left: `${Math.round(viewState.left)}px`,
          top: `${Math.round(viewState.top)}px`,
        }}
      >
        <input
          ref={searchRef}
          type="search"
          className="wilderness-inspect-field wilderness-inspect-var-popover__search"
          placeholder="Search variables"
          aria-label="Search CSS variables"
          value={viewState.query}
          onChange={(event) => {
            const query = event.currentTarget.value;
            _setViewState((prev) => ({ ...prev, query }));
          }}
        />
        <div className="wilderness-inspect-props-list wilderness-inspect-var-popover__list">
          {filtered.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className="wilderness-inspect-var-popover__item"
              aria-label={`Use ${entry.name} variable`}
              onClick={() => {
                if (!applyVariable) {
                  console.warn("[Inspect] Variable picker apply callback is missing.");
                  hide();
                  return;
                }
                applyVariable(`var(${entry.name})`);
                hide();
              }}
            >
              <div className="wilderness-inspect-var-popover__item-heading">
                {entry.previewColor ? (
                  <span className="wilderness-inspect-var-popover__item-swatch" style={{ backgroundColor: entry.previewColor }} />
                ) : null}
                <span className="wilderness-inspect-var-popover__item-name">{entry.name}</span>
              </div>
              <span className="wilderness-inspect-var-popover__item-value">{entry.value}</span>
            </button>
          ))}
        </div>
        <div className="wilderness-inspect-props-empty" style={{ display: filtered.length === 0 ? "block" : "none" }}>
          No variables available for this element.
        </div>
      </div>
    );
  };

  reactRoot.render(<VariablePopover />);

  const openPopover = (anchorEl: HTMLButtonElement, applyVariableFn: (nextValue: string) => void) => {
    const target = getCurrentTarget();
    if (!target) {
      console.warn("[Inspect] Cannot open variable picker without a selected element.");
      setStatusFeedback("No selected element", "error");
      return;
    }

    const scopedVariables = collectScopedCssVariables(target);
    if (scopedVariables.length === 0) {
      setStatusFeedback("No scoped variables", "error");
      return;
    }

    const rect = anchorEl.getBoundingClientRect();
    const panelWidth = 280;
    const preferredLeft = rect.right - panelWidth;
    const left = Math.min(Math.max(PANEL_VIEWPORT_GAP, preferredLeft), window.innerWidth - panelWidth - PANEL_VIEWPORT_GAP);
    const preferredTop = rect.bottom + 6;
    const maxTop = Math.max(PANEL_VIEWPORT_GAP, window.innerHeight - 220 - PANEL_VIEWPORT_GAP);
    const top = Math.min(Math.max(PANEL_VIEWPORT_GAP, preferredTop), maxTop);

    anchor = anchorEl;
    applyVariable = applyVariableFn;
    setPopoverState({
      visible: true,
      query: "",
      left,
      top,
      variables: scopedVariables,
    });
  };

  const appendVariableButton = ({
    field,
    label,
    applyVariable: applyVariableFn,
  }: {
    field: HTMLDivElement;
    label: string;
    applyVariable: (nextValue: string) => void;
  }) => {
    const $button = $('<button type="button" class="wilderness-inspect-var-btn">var</button>')
      .attr("aria-label", `Use CSS variable for ${label}`)
      .attr("title", `Use CSS variable for ${label}`)
      .on("click", function () {
        openPopover(this as HTMLButtonElement, applyVariableFn);
      });
    $(field).append($button);
  };

  return {
    appendVariableButton,
    hide,
    destroy: () => {
      hide();
      setViewState = null;
      anchor = null;
      applyVariable = null;
      reactRoot.unmount();
      host.remove();
    },
  };
};
