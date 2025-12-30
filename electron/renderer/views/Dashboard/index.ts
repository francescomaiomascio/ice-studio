let mounted = false;

export function mountDashboard(container: HTMLElement) {
  if (mounted) return;

  const el = document.createElement("div");
  el.id = "dashboard-root";
  el.textContent = "Dashboard mounted";
  container.appendChild(el);

  mounted = true;
}

export function unmountDashboard(container: HTMLElement) {
  if (!mounted) return;
  container.innerHTML = "";
  mounted = false;
}
