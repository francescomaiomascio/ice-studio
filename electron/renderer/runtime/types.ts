// runtime/types.ts
// ============================================================================
// Runtime-level types (app modes, contexts, etc.)
// ============================================================================

export type AppMode =
  | "preboot"
  | "dashboard"
  | "workspace"
  | "docs"
  | "plugin"
  | "settings";

export type RuntimeMode = "local" | "remote";

export interface RuntimeSessionState {
  active: boolean;
  mode: RuntimeMode | null;
  sessionId: string | null;
  runtimeId: string | null;
}
