import WebSocket from "ws";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";

interface OpenFilePayload {
    path: string;
    content?: string;
}

interface BackendResponse {
    id?: string;
    ok?: boolean;
    error?: string | null;
    data?: any;
}

export class IceStudioClient extends EventEmitter {
    private endpoint: string;
    private ws: WebSocket | null = null;
    private reconnectDelay = 2000;
    private manualClose = false;
    private workspace = "default";
    private pingTimer: NodeJS.Timeout | null = null;
    private loggerEnabled = true;

    // pending request promise map
    private pending = new Map<string, (res: BackendResponse) => void>();

    constructor(endpoint: string) {
        super();
        this.endpoint = endpoint;
    }

    // ============================================================
    // LOGGING
    // ============================================================
    private log(...args: any[]) {
        if (this.loggerEnabled) {
            console.log("[ICE-STUDIO-IDE]", ...args);
        }
    }

    // ============================================================
    // CONNECT
    // ============================================================
    connect() {
        this.manualClose = false;
        this.log("Connecting to", this.endpoint);

        try {
            this.ws = new WebSocket(this.endpoint);

            this.ws.on("open", () => {
                this.log("WS OPEN");
                this.emit("connected");

                // 1. handshake
                this.hello();

                // 2. attach workspace
                this.attach(this.workspace);

                // 3. start client keepalive ping
                this.startPing();
            });

            this.ws.on("message", (raw: WebSocket.Data) => {
                this.handleMessage(raw.toString());
            });

            this.ws.on("close", () => {
                this.log("WS CLOSED");
                this.emit("disconnected");
                this.ws = null;

                this.stopPing();

                // auto reconnect
                if (!this.manualClose) {
                    setTimeout(() => this.connect(), this.reconnectDelay);
                }
            });

            this.ws.on("error", (err) => {
                this.emit("error", String(err));
                this.log("WS ERROR:", err);
            });

        } catch (err) {
            this.emit("error", String(err));
        }
    }

    // ============================================================
    // CLOSE
    // ============================================================
    dispose() {
        this.manualClose = true;
        this.stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // ============================================================
    // KEEPALIVE PING
    // ============================================================
    private startPing() {
        this.stopPing();
        this.pingTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, 20_000); // ogni 20 secondi
    }

    private stopPing() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    // ============================================================
    // HANDSHAKE
    // ============================================================
    private hello() {
        this.send({
            command: "ide.hello",
            client: "vscode",
            version: "0.1",
        });
    }

    // ============================================================
    // ATTACH WORKSPACE
    // ============================================================
    attach(ws: string) {
        this.workspace = ws;
        this.log("Attaching workspace:", ws);

        this.send({
            command: "ide.attach",
            workspace_id: ws,
        });
    }

    // ============================================================
    // REQUEST — Promise based
    // ============================================================
    sendRequest(method: string, params: any = {}): Promise<BackendResponse> {
        return new Promise((resolve) => {
            const id = randomUUID();

            this.pending.set(id, resolve);

            this.send({
                id,
                command: method,
                workspace_id: this.workspace,
                params: params || {},
            });
        });
    }

    // ============================================================
    // LOW-LEVEL SEND
    // ============================================================
    send(obj: any) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.emit("error", "Cannot send: socket not open");
            return;
        }

        const json = JSON.stringify(obj);
        this.log("SEND:", json);
        this.ws.send(json);
    }

    // ============================================================
    // MESSAGE HANDLER
    // ============================================================
    private handleMessage(raw: string) {
        this.log("RECV:", raw);

        try {
            const data = JSON.parse(raw);

            // fulfil pending promises (RPC-style)
            if (data.id && this.pending.has(data.id)) {
                const fn = this.pending.get(data.id)!;
                this.pending.delete(data.id);
                fn(data);
            }

            // open file
            if (data.type === "open_file") {
                const payload: OpenFilePayload = {
                    path: data.path,
                    content: data.content,
                };
                this.emit("open_file", payload);
            }

            // generic status
            if (data.type === "status") {
                this.emit("status", data);
            }

            // broadcast message
            this.emit("message", data);

        } catch (err) {
            this.emit("error", "JSON parse error: " + String(err));
            this.log("JSON ERROR:", err);
        }
    }
}
