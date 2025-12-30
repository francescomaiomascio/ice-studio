import type {
  LocalSummary,
  LocalSystemProfile,
  LocalSystemReport,
} from "./types.js";
import { ICE_LOCAL_REQUIREMENTS } from "../../runtime/requirements.js";

export function buildLocalSummary(
  profile: LocalSystemProfile,
  decision: NonNullable<LocalSystemReport["decision"]>
): LocalSummary {
  const reasons = [...decision.reasons];
  const notes = [...decision.warnings];
  const minGpuVramGB = ICE_LOCAL_REQUIREMENTS.minGpuVramGB ?? null;

  if (
    profile.gpu.present === true &&
    profile.gpu.loadPct != null &&
    profile.gpu.loadPct >= 70
  ) {
    notes.push("GPU busy.");
  }

  if (profile.gpu.present === false) {
    notes.push("CPU-only fallback enabled.");
  }
  if (
    profile.gpu.present === true &&
    profile.gpu.vramFreeGB != null &&
    minGpuVramGB != null &&
    profile.gpu.vramFreeGB < minGpuVramGB
  ) {
    notes.push(
      `VRAM insufficient (${formatNumber(profile.gpu.vramFreeGB)} GB free).`
    );
  }
  const platform = formatPlatform(profile.os, profile.arch);
  const compute = formatCompute(profile);
  const memory = formatMemory(profile.ramFreeGB, profile.ramTotalGB);
  const details = buildDetails(profile, platform, memory);

  const status = decision.status;
  const verdict = buildVerdict(status);

  return {
    status,
    platform,
    compute,
    memory,
    verdict,
    reasons,
    notes,
    details,
  };
}

function formatPlatform(os: string, arch: string): string {
  const name = friendlyPlatformName(os);
  return arch ? `${name} (${arch})` : name;
}

function friendlyPlatformName(os: string): string {
  switch (os) {
    case "linux":
      return "Linux";
    case "macos":
      return "macOS";
    case "windows":
      return "Windows";
    default:
      return "Unknown platform";
  }
}

function formatMemory(
  free: number | null,
  total: number | null
): string {
  const usedPct =
    total != null && total > 0 && free != null
      ? (1 - free / total) * 100
      : null;
  const percent = formatPercent(usedPct);
  return `${formatNumber(free)} GB free / ${formatNumber(total)} GB total (${percent})`;
}

function formatCompute(profile: LocalSystemProfile): string {
  if (profile.gpu.present === true) {
    const name = profile.gpu.name || "Unknown GPU";
    const vram =
      profile.gpu.vramTotalGB != null
        ? `${formatNumber(profile.gpu.vramTotalGB)} GB VRAM`
        : "VRAM ?";
    return `GPU (${name}, ${vram})`;
  }
  if (profile.gpu.present === false) {
    return "CPU-only";
  }
  return "Unknown";
}

function formatCpu(profile: LocalSystemProfile): string {
  if (profile.cpuName) {
    return `${profile.cpuName} (${formatNumber(profile.cpuCores)} cores)`;
  }
  return `${formatNumber(profile.cpuCores)} cores`;
}

function formatGpu(profile: LocalSystemProfile): string {
  if (profile.gpu.present === true) {
    return profile.gpu.name || "Unknown GPU";
  }
  if (profile.gpu.present === false) {
    return "None detected";
  }
  return "Unknown";
}

function formatVram(profile: LocalSystemProfile): string {
  if (profile.gpu.present !== true) {
    return "Not available";
  }
  if (
    profile.gpu.vramFreeGB != null &&
    profile.gpu.vramTotalGB != null
  ) {
    return `${formatNumber(profile.gpu.vramFreeGB)} GB free / ${formatNumber(profile.gpu.vramTotalGB)} GB total`;
  }
  if (profile.gpu.vramTotalGB != null) {
    return `${formatNumber(profile.gpu.vramTotalGB)} GB total`;
  }
  return "?";
}

function buildDetails(
  profile: LocalSystemProfile,
  platform: string,
  memory: string
): LocalSummary["details"] {
  return [
    { label: "Platform", value: platform },
    { label: "CPU", value: formatCpu(profile) },
    {
      label: "CPU Load",
      value:
        profile.cpuLoadPct != null
          ? formatPercent(profile.cpuLoadPct)
          : "Unknown",
    },
    { label: "GPU", value: formatGpu(profile) },
    { label: "VRAM", value: formatVram(profile) },
    {
      label: "GPU Load",
      value:
        profile.gpu.present === false
          ? "Not available"
          : profile.gpu.loadPct != null
          ? formatPercent(profile.gpu.loadPct)
          : "Unknown",
    },
    { label: "Memory", value: memory },
  ];
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return "?";
  }
  return (Math.round(Number(value) * 10) / 10).toFixed(1);
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return "?%";
  }
  return `${Number(value).toFixed(1)}%`;
}

function buildVerdict(status: LocalSummary["status"]): string {
  switch (status) {
    case "APPROVED":
      return "Local runtime is fully supported on this machine.";
    case "LIMITED":
      return "Local runtime can run, but performance will be limited.";
    case "BLOCKED":
    default:
      return "Local runtime cannot be launched on this machine.";
  }
}
