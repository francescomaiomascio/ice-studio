// layout/components/Sidebar.ts
// ============================================================================

export class Sidebar {
  private readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.classList.add("ice-sidebar");
    this.root.textContent = "Sidebar";
  }

  mount(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  unmount(): void {
    this.root.remove();
  }
}
