// kernel/LayoutContext.ts
// ============================================================================
// Immutable-ish layout state container
// ============================================================================

import type { LayoutMode } from "./modes.js";

export class LayoutContext {
  private _mode: LayoutMode = "preboot";
  private activeRegions = new Set<string>();
  private flags = new Map<string, unknown>();

  // -------------------------------------------------------------------------
  // MODE
  // -------------------------------------------------------------------------
  get mode(): LayoutMode {
    return this._mode;
  }

  setMode(mode: LayoutMode): void {
    this._mode = mode;
  }

  // -------------------------------------------------------------------------
  // REGIONS
  // -------------------------------------------------------------------------
  enableRegion(regionId: string): void {
    this.activeRegions.add(regionId);
  }

  disableRegion(regionId: string): void {
    this.activeRegions.delete(regionId);
  }

  isRegionActive(regionId: string): boolean {
    return this.activeRegions.has(regionId);
  }

  getActiveRegions(): Set<string> {
    return new Set(this.activeRegions);
  }

  // -------------------------------------------------------------------------
  // FLAGS
  // -------------------------------------------------------------------------
  setFlag<T = unknown>(key: string, value: T): void {
    this.flags.set(key, value);
  }

  getFlag<T = unknown>(key: string): T | undefined {
    return this.flags.get(key) as T | undefined;
  }

  // -------------------------------------------------------------------------
  // RESET
  // -------------------------------------------------------------------------
  reset(): void {
    this.activeRegions.clear();
    this.flags.clear();
  }
}
