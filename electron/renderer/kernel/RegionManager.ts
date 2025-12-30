// kernel/RegionManager.ts
// ============================================================================
// Controls lifecycle of layout regions
// ============================================================================

import { RegionNotFoundError } from "./errors.js";

export interface LayoutRegion {
  id: string;
  mount(): void;
  unmount(): void;
}

export class RegionManager {
  private regions = new Map<string, LayoutRegion>();

  register(region: LayoutRegion): void {
    if (!region?.id) {
      throw new Error("[RegionManager] Region must have an id");
    }
    this.regions.set(region.id, region);
  }

  get(regionId: string): LayoutRegion {
    const region = this.regions.get(regionId);
    if (!region) {
      throw new RegionNotFoundError(regionId);
    }
    return region;
  }

  enable(regionIds: Iterable<string>): void {
    const active = new Set(regionIds);

    for (const region of this.regions.values()) {
      if (active.has(region.id)) {
        region.mount();
      } else {
        region.unmount();
      }
    }
  }

  reset(): void {
    for (const region of this.regions.values()) {
      region.unmount();
    }
  }
}
