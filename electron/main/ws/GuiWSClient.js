// electron/main/ws/GuiWSClient.js
const WebSocket = require("ws");
const { BrowserWindow } = require("electron");
const logger = require("../logger/logger.js");
const { appendHttpEvent } = require("../logger/http-log.js");

const GUI_WS_URL = process.env.ICE_STUDIO_WS_URL || "ws://127.0.0.1:7031/gui";
const RETRY_DELAY = 1500;
const WS_CHANNEL = "/gui";

class GuiWSClient {
    constructor() {
        if (GuiWSClient._instance) return GuiWSClient._instance;
        GuiWSClient._instance = this;

        this.socket = null;
        this.reconnectTimer = null;
        this.connected = false;
        this._notReadyWarned = false;
        this._pending = [];
        this._maxPending = 200;

        this._connect();
    }

    // ----------------------------------------------------
    // Internal connect
    // ----------------------------------------------------
    _connect() {
        if (this.connected || this.socket) {
            return;
        }

        logger.logEvent(
            `[INFO] ws.gui.connect MAIN Connecting to backend | data=${JSON.stringify({ url: GUI_WS_URL })}`
        );
        appendHttpEvent({
            transport: "ws",
            channel: WS_CHANNEL,
            event: "connect_attempt",
            direction: "client->server",
            url: GUI_WS_URL,
        });
        this.socket = new WebSocket(GUI_WS_URL);

        this.socket.on("open", () => {
            this.connected = true;
            this._notReadyWarned = false;
            logger.logEvent("[INFO] ws.gui.open MAIN Connected to backend WS");
            appendHttpEvent({
                transport: "ws",
                channel: WS_CHANNEL,
                event: "open",
                direction: "client->server",
                url: GUI_WS_URL,
            });
            this._flushPending();
            this._broadcastStatus(true);
        });

        this.socket.on("message", (raw) => {
            const msg = raw.toString();
            appendHttpEvent({
                transport: "ws",
                channel: WS_CHANNEL,
                event: "message",
                direction: "server->client",
                size_bytes: Buffer.byteLength(msg),
            });
                BrowserWindow.getAllWindows().forEach((win) => {
                    try {
                        win.webContents.send("ice-ws:incoming", msg);
                    } catch (_) {}
                });
        });

        this.socket.on("error", (err) => {
            const errorPayload = { error: err?.message || String(err) };
            logger.logEvent(
                `[ERROR] ws.gui.error MAIN WS error | data=${JSON.stringify(errorPayload)}`
            );
            appendHttpEvent({
                transport: "ws",
                channel: WS_CHANNEL,
                event: "error",
                direction: "client->server",
                data: errorPayload,
            });
        });

        this.socket.on("close", (code, reason) => {
            this.connected = false;
            this._notReadyWarned = false;
            logger.logEvent("[WARN] ws.gui.close MAIN WS closed");
            appendHttpEvent({
                transport: "ws",
                channel: WS_CHANNEL,
                event: "close",
                direction: "client->server",
                data: {
                    code,
                    reason: reason ? reason.toString() : undefined,
                },
            });
            this.socket = null;
            this._broadcastStatus(false);
            if (BrowserWindow.getAllWindows().length === 0) {
                return;
            }
            this._scheduleReconnect();
        });
    }

    // ----------------------------------------------------
    // Reconnect (debounced)
    // ----------------------------------------------------
    _scheduleReconnect() {
        if (this.reconnectTimer) return;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this._connect();
        }, RETRY_DELAY);
    }

    // ----------------------------------------------------
    // Broadcast WS status to renderer
    // ----------------------------------------------------
    _broadcastStatus(connected) {
        BrowserWindow.getAllWindows().forEach((win) => {
            try {
                win.webContents.send("ws:status", { connected });
            } catch (_) {}
        });
    }

    // ----------------------------------------------------
    // Public send
    // ----------------------------------------------------
    send(msg) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this._enqueue(msg);
            return false;
        }
        try {
            const payload = JSON.stringify(msg);
            this.socket.send(payload);
            appendHttpEvent({
                transport: "ws",
                channel: WS_CHANNEL,
                event: "send",
                direction: "client->server",
                size_bytes: Buffer.byteLength(payload),
            });
            return true;
        } catch (err) {
            const errorPayload = { error: err?.message || err };
            console.error("[WS] send failed", errorPayload);
            appendHttpEvent({
                transport: "ws",
                channel: WS_CHANNEL,
                event: "send_error",
                direction: "client->server",
                data: errorPayload,
            });
            return false;
        }
    }

    _enqueue(msg) {
        if (this._pending.length >= this._maxPending) {
            this._pending.shift();
        }
        this._pending.push(msg);
        if (!this._notReadyWarned) {
            console.error("[WS] send attempted but socket not ready");
            this._notReadyWarned = true;
        }
    }

    _flushPending() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        if (this._pending.length) {
            logger.logEvent(
                `[INFO] ws.gui.flush MAIN Flushing pending messages count=${this._pending.length}`
            );
        }
        while (this._pending.length) {
            const msg = this._pending.shift();
            try {
                const payload = JSON.stringify(msg);
                this.socket.send(payload);
                appendHttpEvent({
                    transport: "ws",
                    channel: WS_CHANNEL,
                    event: "send",
                    direction: "client->server",
                    size_bytes: Buffer.byteLength(payload),
                    buffered: true,
                });
            } catch (err) {
                const errorPayload = { error: err?.message || err };
                console.error("[WS] send failed", errorPayload);
                appendHttpEvent({
                    transport: "ws",
                    channel: WS_CHANNEL,
                    event: "send_error",
                    direction: "client->server",
                    data: errorPayload,
                });
                break;
            }
        }
    }
}

if (!global.__ICE_STUDIO_GUI_WS_CLIENT__) {
    global.__ICE_STUDIO_GUI_WS_CLIENT__ = new GuiWSClient();
}

module.exports = global.__ICE_STUDIO_GUI_WS_CLIENT__;
