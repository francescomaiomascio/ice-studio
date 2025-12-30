// layout/components/PaneTabs.ts
// ============================================================================

export class PaneTabs {
  private readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.classList.add("ice-pane-tabs");
  }

  addTab(label: string): void {
    const tab = document.createElement("button");
    tab.textContent = label;
    tab.classList.add("ice-tab");
    this.root.appendChild(tab);
  }

  mount(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  unmount(): void {
    this.root.remove();
  }
}
