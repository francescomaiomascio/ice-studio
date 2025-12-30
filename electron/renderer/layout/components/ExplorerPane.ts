// layout/components/ExplorerPane.ts
// ============================================================================

export class ExplorerPane {
  private readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.classList.add("ice-explorer");
    this.root.textContent = "Explorer";
  }

  mount(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  unmount(): void {
    this.root.remove();
  }
}
