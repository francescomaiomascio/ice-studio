import type { RuntimeCapabilities } from "./capabilities.js";
import { ICE_LOCAL_REQUIREMENTS } from "./requirements.js";

export type RuntimeVerdict = "READY" | "LIMITED" | "BLOCKED";

export interface RuntimeEvaluation {
  status: RuntimeVerdict;
  reasons: string[];
  notes: string[];
}

export function evaluateLocalRuntime(
  caps: RuntimeCapabilities
): RuntimeEvaluation {
  const reasons: string[] = [];
  const notes: string[] = [];

  if (ICE_LOCAL_REQUIREMENTS.requiresBackend && !caps.backendAvailable) {
    reasons.push("No compatible local runtime backend detected.");
  }

  if (caps.cpuCores != null) {
    if (caps.cpuCores < ICE_LOCAL_REQUIREMENTS.minCpuCores) {
      reasons.push(
        `Insufficient CPU cores (${caps.cpuCores} detected, ${ICE_LOCAL_REQUIREMENTS.minCpuCores} required).`
      );
    }
  } else {
    notes.push("Unable to determine CPU core count.");
  }

  if (caps.ramFreeGB != null) {
    if (caps.ramFreeGB < ICE_LOCAL_REQUIREMENTS.minRamFreeGB) {
      reasons.push(
        `Insufficient free system memory (${caps.ramFreeGB} GB available, ${ICE_LOCAL_REQUIREMENTS.minRamFreeGB} GB required).`
      );
    } else if (caps.ramFreeGB < ICE_LOCAL_REQUIREMENTS.recommendedRamFreeGB) {
      notes.push(
        "System meets minimum requirements but may be resource constrained."
      );
    }
  } else {
    notes.push("Unable to determine available system memory.");
  }

  const minGpuVramGB = ICE_LOCAL_REQUIREMENTS.minGpuVramGB ?? 0;
  const vramFreeGB = caps.gpu.vramFreeGB;
  const vramTotalGB = caps.gpu.vramTotalGB;
  const vramCheckGB =
    vramFreeGB != null ? vramFreeGB : vramTotalGB;

  if (caps.gpu.present === null) {
    notes.push(
      "GPU information unavailable. Falling back to CPU-only evaluation."
    );
  } else if (caps.gpu.present === false) {
    notes.push("CPU-only execution detected. Performance may be limited.");
  } else if (
    minGpuVramGB > 0 &&
    vramCheckGB != null &&
    vramCheckGB < minGpuVramGB
  ) {
    const label = vramFreeGB != null ? "free VRAM" : "VRAM";
    notes.push(
      `GPU ${label} below recommended level (${vramCheckGB} GB, recommended ${minGpuVramGB} GB).`
    );
  }

  let status: RuntimeVerdict;
  if (reasons.length > 0) {
    status = "BLOCKED";
  } else if (notes.length > 0) {
    status = "LIMITED";
  } else {
    status = "READY";
  }

  return { status, reasons, notes };
}
