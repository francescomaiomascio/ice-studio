// layout/components/Splitter.ts
// ============================================================================

export class Splitter {
  private readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.classList.add("ice-splitter");
  }

  mount(host: HTMLElement): void {
    host.appendChild(this.root);
  }

  unmount(): void {
    this.root.remove();
  }
}
