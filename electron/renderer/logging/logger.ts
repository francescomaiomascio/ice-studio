export type LogLevel =
  | "TRACE"
  | "DEBUG"
  | "INFO"
  | "WARN"
  | "ERROR"
  | "FATAL";

export interface LogEvent {
  ts: string;
  level: LogLevel;
  layer: string;
  scope?: string;
  phase?: string;
  msg: string;
  data?: unknown;
}

export function nowISO(): string {
  return new Date().toISOString();
}
