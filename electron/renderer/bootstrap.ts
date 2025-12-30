import { appRoot } from "./AppRoot.js";

export function bootstrapRenderer(): void {
  appRoot.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapRenderer);
} else {
  bootstrapRenderer();
}
