import { mountPrebootView } from "./PrebootView.js";

export { mountPrebootView };

let mounted = false;
let destroy: (() => void) | null = null;

export function mountPreboot(container: HTMLElement) {
  if (mounted) return;
  const instance = mountPrebootView({ root: container });
  destroy = instance.destroy;
  mounted = true;
}

export function unmountPreboot(container: HTMLElement) {
  if (!mounted) return;
  destroy?.();
  destroy = null;
  container.innerHTML = "";
  mounted = false;
}
