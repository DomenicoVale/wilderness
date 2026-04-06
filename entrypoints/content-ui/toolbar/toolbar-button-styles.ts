import { cn } from "../../../lib/utils";

export const getToolbarButtonClassName = (active?: boolean) =>
  cn(
    "inline-flex h-10 items-center gap-2 rounded-none border border-white/80 bg-slate-100/90 px-3.5 text-[13px] font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-150 hover:-translate-y-px hover:bg-white hover:text-slate-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white focus-visible:outline-offset-0 focus-visible:ring-0",
    active &&
      "border-sky-300/70 bg-sky-600 text-white shadow-[0_10px_24px_-16px_rgba(14,116,144,0.95)] hover:bg-sky-500 hover:text-white"
  );

export const toolbarIconClassName = "h-3.5 w-3.5";
