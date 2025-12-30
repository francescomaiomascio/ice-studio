export type IceStudioEvent =
  | OpenFileEvent
  | DiagnosticsEvent
  | StatusEvent;

export interface BaseMessage {
  type: string;
}

export interface OpenFileEvent extends BaseMessage {
  type: "open_file";
  path: string;
  content?: string;
}

export interface DiagnosticsEvent extends BaseMessage {
  type: "diagnostics";
  path: string;
  diagnostics: Array<{
    line: number;
    message: string;
    severity: "info" | "warning" | "error";
  }>;
}

export interface StatusEvent extends BaseMessage {
  type: "status";
  message: string;
  level: "info" | "warning" | "error";
}
