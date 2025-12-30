// runtime/CapabilityRegistry.ts
// ============================================================================
// ICE Studio GUI — Capability Registry
// Exposes controlled powers to agents, panels, runtime
// ============================================================================

export type CapabilityHandler<T = unknown> = (payload: T) => void;

export class CapabilityRegistry {
  private capabilities = new Map<string, CapabilityHandler<unknown>>();

  register<T>(name: string, handler: CapabilityHandler<T>): void {
    if (this.capabilities.has(name)) {
      throw new Error(`[CapabilityRegistry] Capability already registered: ${name}`);
    }
    this.capabilities.set(name, handler as CapabilityHandler<unknown>);
  }

  invoke<T>(name: string, payload: T): void {
    const handler = this.capabilities.get(name) as CapabilityHandler<T> | undefined;
    if (!handler) {
      throw new Error(`[CapabilityRegistry] Capability not found: ${name}`);
    }
    handler(payload);
  }

  has(name: string): boolean {
    return this.capabilities.has(name);
  }
}
