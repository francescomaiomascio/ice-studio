// layout/regions/SidebarRegion.ts
// ============================================================================

import { BaseRegion } from "../components/BaseRegion.js";
import { Sidebar } from "../components/Sidebar.js";

export class SidebarRegion extends BaseRegion {
  readonly id = "sidebar";
  private sidebar: Sidebar | null = null;

  protected onMount(): void {
    const el = this.requireRoot();
    this.sidebar = new Sidebar();
    this.sidebar.mount(el);
  }

  protected onUnmount(): void {
    this.sidebar?.unmount();
    this.sidebar = null;
  }
}
