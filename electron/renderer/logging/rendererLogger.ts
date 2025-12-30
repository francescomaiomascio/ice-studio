import { nowISO, type LogEvent, type LogLevel } from "./logger.js";

type ConsoleMethod = "log" | "info" | "debug" | "warn" | "error";

declare global {
  interface Window {
    __ICE_LOG_RENDERER__?: (event: LogEvent) => void;
  }
}

const baseConsole: Console | undefined =
  typeof globalThis !== "undefined" ? globalThis.console : undefined;

const LEVEL_TO_CONSOLE: Record<LogLevel, ConsoleMethod> = {
  TRACE: "debug",
  DEBUG: "log",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  FATAL: "error",
};

function emit(event: LogEvent): boolean {
  try {
    if (typeof window !== "undefined") {
      window.__ICE_LOG_RENDERER__?.(event);
      return true;
    }
  } catch {
    // ignore bridge errors
  }
  return false;
}

export function rendererLog(
  level: LogLevel,
  scope: string,
  msg: string,
  data?: unknown
): void {
  const phase =
    typeof window !== "undefined"
      ? (window as any).__ICE_PHASE__ ?? (window as any).__ICE_RUNTIME_PHASE__
      : undefined;
  const event: LogEvent = {
    ts: nowISO(),
    level,
    layer: "renderer",
    scope,
    phase,
    msg,
    data,
  };

  const bridged = emit(event);

  if (!bridged) {
    const method = LEVEL_TO_CONSOLE[level] || "log";
    baseConsole?.[method]?.(`[${scope}] ${msg}`, data ?? "");
  }
}

function normalizeConsoleArgs(
  args: unknown[]
): { message: string; data?: unknown } {
  if (!args.length) {
    return { message: "(empty)" };
  }
  const [first, ...rest] = args;
  if (typeof first === "string") {
    return { message: first, data: rest.length ? rest : undefined };
  }
  return {
    message: "(console)",
    data: args.length === 1 ? first : args,
  };
}

export function bindConsole(scope = "console"): Console {
  if (!baseConsole) return globalThis.console;
  const proxy: Console = Object.create(baseConsole);

  const attach = (
    method: ConsoleMethod,
    level: LogLevel,
    forward: boolean
  ) => {
    proxy[method] = (...args: unknown[]) => {
      const { message, data } = normalizeConsoleArgs(args);
      rendererLog(level, scope, message, data);
      if (forward) {
        baseConsole?.[method]?.(...args);
      }
    };
  };

  attach("debug", "TRACE", false);
  attach("log", "DEBUG", false);
  attach("info", "INFO", false);
  attach("warn", "WARN", true);
  attach("error", "ERROR", true);

  (globalThis as any).console = proxy;
  return proxy;
}

export function initRendererLogger(): void {
  rendererLog("INFO", "bootstrap", "renderer logger initialized");
}
