// layout/adapters/RegionAdapter.ts
export interface LayoutComponent {
  mount(container: HTMLElement): void;
  unmount(): void;
}
