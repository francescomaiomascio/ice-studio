// layout/components/BaseRegion.ts
// ============================================================================
// ICE Studio GUI — Base Layout Region
// Foundation class for all visual regions
// ============================================================================

import type { LayoutRegion } from "../../kernel/RegionManager.js";
import { rendererLog } from "../../logging/rendererLogger.js";

export abstract class BaseRegion implements LayoutRegion {
  /** Unique region identifier (e.g. "topbar", "editor") */
  public abstract readonly id: string;

  /** Root DOM element of the region */
  protected root: HTMLElement | null = null;

  /** Internal mounted state */
  private mounted = false;

  // --------------------------------------------------------------------------
  // PUBLIC LIFECYCLE (CALLED BY KERNEL)
  // --------------------------------------------------------------------------

  /**
   * Mount the region into the DOM.
   * This method is idempotent.
   */
  mount(): void {
    if (this.mounted) return;

    const container = this.createRootElement();
    const host = document.getElementById("main-view") ?? document.body;
    host.appendChild(container);

    this.root = container;
    this.mounted = true;

    this.onMount();

    if (this.shouldLogLifecycle()) {
      rendererLog("TRACE", "BaseRegion", "mounted", { id: this.id });
    }
  }

  /**
   * Unmount the region from the DOM.
   * This method is idempotent.
   */
  unmount(): void {
    if (!this.mounted) return;

    this.onUnmount();

    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }

    this.root = null;
    this.mounted = false;

    if (this.shouldLogLifecycle()) {
      rendererLog("TRACE", "BaseRegion", "unmounted", { id: this.id });
    }
  }

  // --------------------------------------------------------------------------
  // EXTENSION POINTS (OVERRIDE IN SUBCLASSES)
  // --------------------------------------------------------------------------

  /**
   * Hook executed after the region is mounted.
   * Override in subclasses to attach layout components.
   */
  protected onMount(): void {
    // no-op
  }

  /**
   * Hook executed before the region is unmounted.
   * Override in subclasses to cleanup resources.
   */
  protected onUnmount(): void {
    // no-op
  }

  // --------------------------------------------------------------------------
  // DOM CREATION
  // --------------------------------------------------------------------------

  /**
   * Creates the root DOM element for the region.
   * Can be overridden for custom structure.
   */
  protected createRootElement(): HTMLElement {
    const el = document.createElement("div");
    el.id = `region-${this.id}`;
    el.dataset.region = this.id;
    el.classList.add("ice-region", `ice-region-${this.id}`);
    return el;
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Ensure the region is mounted before accessing the root.
   */
  protected requireRoot(): HTMLElement {
    if (!this.root) {
      throw new Error(`[Region:${this.id}] not mounted`);
    }
    return this.root;
  }

  /**
   * Returns whether the region is currently mounted.
   */
  isMounted(): boolean {
    return this.mounted;
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------
  private shouldLogLifecycle(): boolean {
    const meta = import.meta as unknown as { env?: { DEV?: boolean } };
    return meta?.env?.DEV ?? true;
  }
}
