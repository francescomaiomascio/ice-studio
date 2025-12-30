// kernel/modes.ts
// ============================================================================
// Declarative layout modes
// ============================================================================

export type LayoutMode = "preboot" | "dashboard" | "workspace";
// NOTE: "preboot" is only valid when no runtime is active.
export type AppMode = "preboot" | "dashboard" | "workspace";

export const LAYOUT_MODES: Record<LayoutMode, string[]> = {
  preboot: [],
  dashboard: ["topbar"],
  workspace: [
    "topbar",
    "sidebar",
    "explorer",
    "editor",
    "terminal",
    "bottombar",
  ],
};
