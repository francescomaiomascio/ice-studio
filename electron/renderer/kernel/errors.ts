// kernel/errors.ts
// ============================================================================
// Kernel-level errors (layout / lifecycle)
// ============================================================================

export class KernelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KernelError";
  }
}

export class InvalidModeError extends KernelError {
  constructor(mode: string) {
    super(`Invalid layout mode: ${mode}`);
    this.name = "InvalidModeError";
  }
}

export class RegionNotFoundError extends KernelError {
  constructor(regionId: string) {
    super(`Region not found: ${regionId}`);
    this.name = "RegionNotFoundError";
  }
}

export class PanelNotFoundError extends KernelError {
  constructor(panelId: string) {
    super(`Panel not found: ${panelId}`);
    this.name = "PanelNotFoundError";
  }
}
