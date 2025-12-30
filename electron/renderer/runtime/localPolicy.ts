import type { LocalSystemProfile } from "../views/Preboot/types.js";

export type PolicyStatus = "APPROVED" | "LIMITED" | "BLOCKED";
export type ExecutionPath = "gpu" | "cpu";

export interface LocalPolicyDecision {
  status: PolicyStatus;
  execution: {
    preferred: ExecutionPath;
    fallback: "cpu" | null;
  } | null;
  reasons: string[];
  warnings: string[];
}

const MIN_RAM_SAFE_GB = 6;
const MIN_RAM_CPU_ONLY_GB = 12;
const MIN_CPU_CORES_CPU_ONLY = 8;
const MIN_VRAM_GB = 6;

export function evaluateLocalPolicy(
  profile: LocalSystemProfile
): LocalPolicyDecision {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const ramFree = profile.ramFreeGB;
  const cpuCores = profile.cpuCores ?? 0;

  const hasCuda = profile.gpu.present === true;
  const vramFreeGb = profile.gpu.vramFreeGB ?? null;

  if (ramFree == null) {
    warnings.push("System memory could not be verified.");
  } else if (ramFree < MIN_RAM_SAFE_GB) {
    return {
      status: "BLOCKED",
      execution: null,
      reasons: ["Insufficient free system RAM"],
      warnings: [],
    };
  }

  if (hasCuda && vramFreeGb != null && vramFreeGb >= MIN_VRAM_GB) {
    return {
      status: "APPROVED",
      execution: {
        preferred: "gpu",
        fallback: "cpu",
      },
      reasons: [],
      warnings: [],
    };
  }

  if (
    cpuCores >= MIN_CPU_CORES_CPU_ONLY &&
    (ramFree ?? 0) >= MIN_RAM_CPU_ONLY_GB
  ) {
    warnings.push("CPU-only execution enabled. Performance will be limited.");
    if (profile.os === "macos") {
      warnings.push(
        "Apple Silicon detected: CPU-only execution may be unstable under heavy load."
      );
    }
    return {
      status: "LIMITED",
      execution: {
        preferred: "cpu",
        fallback: null,
      },
      reasons: [],
      warnings,
    };
  }

  reasons.push("System does not meet minimum requirements for safe execution.");
  return {
    status: "BLOCKED",
    execution: null,
    reasons,
    warnings: [],
  };
}
