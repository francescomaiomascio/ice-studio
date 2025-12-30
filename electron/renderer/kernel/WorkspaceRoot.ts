// kernel/WorkspaceRoot.ts
// ============================================================================
// Entry point for workspace runtime
// ============================================================================

import type { LayoutEngine } from "./LayoutEngine.js";
import { rendererLog } from "../logging/rendererLogger.js";
import { RuntimeSession } from "../runtime/RuntimeSession.js";

export interface WorkspaceDescriptor {
  id: string;
  path: string;
  metadata?: Record<string, unknown>;
}

export class WorkspaceRoot {
  constructor(
    private readonly layoutEngine: LayoutEngine,
    private readonly workspace: WorkspaceDescriptor
  ) {}

  mount(): void {
    try {
      RuntimeSession.assertActive();
    } catch (err) {
      rendererLog("WARN", "WorkspaceRoot", "runtime not active", {
        error: err instanceof Error ? err.message : err,
      });
      (window as any).__ICE_APP_RUNTIME__?.enter?.("preboot");
      return;
    }
    rendererLog("INFO", "WorkspaceRoot", "mount", this.workspace);
    this.layoutEngine.setMode("workspace");
  }

  unmount(): void {
    rendererLog("INFO", "WorkspaceRoot", "unmount", {
      workspaceId: this.workspace.id,
    });
  }
}
