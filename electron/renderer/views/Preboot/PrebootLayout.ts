export function PrebootLayout({
  main,
  sidebar,
}: {
  main: string;
  sidebar: string;
}): string {
  return `
    <div class="preboot-root">
      <div class="preboot-drag-area"></div>
      <div class="preboot-layout">
        <main class="preboot-main">
          ${main}
        </main>
        <aside class="preboot-side">
          ${sidebar}
        </aside>
      </div>
    </div>
  `;
}
