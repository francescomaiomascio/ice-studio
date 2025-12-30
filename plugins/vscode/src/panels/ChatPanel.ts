import * as vscode from "vscode";
import { IceStudioClient } from "../client/IceClient";

export class ChatPanel {
    static currentPanel: ChatPanel | undefined;

    private readonly panel: vscode.WebviewView;
    private disposables: vscode.Disposable[] = [];

    constructor(view: vscode.WebviewView, private client: IceStudioClient) {
        this.panel = view;

        this.panel.webview.options = {
            enableScripts: true
        };

        this.panel.webview.html = this.getHtml();

        // Ricevi messaggi dalla webview → manda al backend
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === "send_prompt") {
                const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                this.client.send({
                    command: "ide.chat",
                    params: {
                        prompt: msg.prompt,
                        root,
                    },
                    workspace_id: "default"
                });
            }
        });

        // Eventi dal backend → webview
        this.client.on("status", (data) => {
            this.sendToWebview({ type: "status", data });
        });

        this.client.on("message", (data: any) => {
            if (data.type === "status") {
                this.sendToWebview({ type: "status", data });
            }
            if (data.type === "open_file") {
                this.sendToWebview({ type: "event", data });
            }
            // RPC responses (senza type) o altri payload
            if (!data.type) {
                this.sendToWebview({ type: "response", data });
            }
        });
    }

    private sendToWebview(msg: any) {
        this.panel.webview.postMessage(msg);
    }

    private getHtml(): string {
        return `
        <html>
        <head>
            <style>
                :root {
                    color-scheme: var(--vscode-color-scheme, dark);
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                header {
                    padding: 10px 14px;
                    border-bottom: 1px solid var(--vscode-editorGroup-border, #1f2937);
                    font-weight: 600;
                    letter-spacing: 0.02em;
                }
                #log {
                    flex: 1;
                    overflow-y: auto;
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .row {
                    display: flex;
                }
                .row.user {
                    justify-content: flex-end;
                }
                .row.bot {
                    justify-content: flex-start;
                }
                .bubble {
                    max-width: 80%;
                    background: var(--vscode-editorWidget-background, #111827);
                    border: 1px solid var(--vscode-editorGroup-border, #1f2937);
                    border-radius: 20px;
                    padding: 10px 12px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
                    font-size: 13px;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    position: relative;
                }
                .bubble.user {
                    background: var(--vscode-button-background, #1d4ed8);
                    border-color: var(--vscode-button-background, #1d4ed8);
                    color: var(--vscode-button-foreground, #e5e7eb);
                }
                .bubble .tag {
                    display: inline-block;
                    margin-bottom: 4px;
                    padding: 2px 8px;
                    border-radius: 999px;
                    font-size: 11px;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: #a5f3fc;
                    background: rgba(14,165,233,0.12);
                    border: 1px solid rgba(14,165,233,0.25);
                }
                .edit-btn {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    border: none;
                    background: rgba(255,255,255,0.08);
                    color: inherit;
                    border-radius: 8px;
                    padding: 2px 6px;
                    font-size: 11px;
                    cursor: pointer;
                    opacity: 0.8;
                }
                .edit-btn:hover {
                    opacity: 1;
                    background: rgba(255,255,255,0.15);
                }
                #input-bar {
                    padding: 12px;
                    background: var(--vscode-editor-background);
                    border-top: 1px solid var(--vscode-editorGroup-border, #1f2937);
                }
                .input-shell {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    background: transparent;
                    border: none;
                    border-radius: 0;
                    padding: 0;
                    box-shadow: none;
                }
                #prompt {
                    border: 1px solid transparent;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    resize: none;
                    height: 100px;
                    font-size: 14px;
                    outline: none;
                    border-radius: 20px;
                    padding: 12px 56px 12px 12px; /* spazio per i pulsanti interni */
                    width: 100%;
                    box-sizing: border-box;
                }
                .buttons-row {
                    position: absolute;
                    right: 8px;
                    bottom: 8px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    background: transparent;
                }
                .icon-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    border: 1px solid var(--vscode-editorGroup-border, #1f2937);
                    background: var(--vscode-editorWidget-background, #0f172a);
                    color: var(--vscode-editor-foreground);
                    font-weight: 700;
                    cursor: pointer;
                    display: grid;
                    place-items: center;
                    transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.12s ease;
                }
                .icon-btn:active {
                    transform: translateY(1px);
                    box-shadow: inset 0 2px 6px rgba(0,0,0,0.3);
                }
                #send {
                    background: var(--vscode-button-background, #22c55e);
                    color: var(--vscode-button-foreground, #0b1222);
                    border: none;
                }
            </style>
        </head>
        <body>
            <header>ICE Studio Chat</header>
            <div id="log"></div>
            <div id="input-bar">
                <div class="input-shell">
                    <textarea id="prompt" placeholder="Scrivi un prompt…" ></textarea>
                    <div class="buttons-row">
                        <button id="add" class="icon-btn">+</button>
                        <button id="send" class="icon-btn">&#10148;</button>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const log = document.getElementById("log");
                const promptInput = document.getElementById("prompt");
                const sendBtn = document.getElementById("send");
                let inFlight = false;
                let activeRequestId = null;
                let canceled = false;
                let thinkingBubble = null;
                let thinkingStatusList = null;
                let lastStatus = "";

                function appendBubble(text, role = "bot") {
                    const row = document.createElement("div");
                    row.className = "row " + (role === "user" ? "user" : "bot");
                    const div = document.createElement("div");
                    div.className = "bubble " + (role === "user" ? "user" : "");
                    div.textContent = text;
                    if (role === "user") {
                        const edit = document.createElement("button");
                        edit.className = "edit-btn";
                        edit.textContent = "✏️";
                        edit.title = "Modifica e reinvia";
                        edit.onclick = () => {
                            promptInput.value = text;
                            promptInput.focus();
                        };
                        div.appendChild(edit);
                    }
                    row.appendChild(div);
                    log.appendChild(row);
                    log.scrollTop = log.scrollHeight;
                    return row;
                }

                function showThinking() {
                    clearThinking();
                    const row = document.createElement("div");
                    row.className = "row bot";
                    const div = document.createElement("div");
                    div.className = "bubble thinking";
                    const label = document.createElement("div");
                    label.textContent = "thinking…";
                    const list = document.createElement("div");
                    list.className = "status-list";
                    div.appendChild(label);
                    div.appendChild(list);
                    row.appendChild(div);
                    log.appendChild(row);
                    log.scrollTop = log.scrollHeight;
                    thinkingBubble = row;
                    thinkingStatusList = list;
                }

                function clearThinking() {
                    if (thinkingBubble && thinkingBubble.parentNode) {
                        thinkingBubble.parentNode.removeChild(thinkingBubble);
                    }
                    thinkingBubble = null;
                    thinkingStatusList = null;
                    lastStatus = "";
                }

                function sendPrompt() {
                    const prompt = promptInput.value.trim();
                    if (!prompt) return;
                    if (inFlight) {
                        cancelPrompt();
                    }
                    setSending(false);
                    inFlight = false;
                    activeRequestId = null;
                    canceled = false;
                    const reqId = "req-" + Date.now();
                    activeRequestId = reqId;
                    setSending(true);
                    appendBubble(prompt, "user");
                    showThinking();
                    vscode.postMessage({ type: "send_prompt", prompt, id: reqId });
                    promptInput.value = "";
                }

                function cancelPrompt() {
                    if (!inFlight) return;
                    canceled = true;
                    activeRequestId = null;
                    setSending(false);
                    clearThinking();
                    appendBubble("Richiesta annullata.", "bot");
                }

                sendBtn.onclick = () => {
                    if (inFlight) {
                        cancelPrompt();
                    } else {
                        sendPrompt();
                    }
                };
                promptInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendPrompt();
                    }
                });

                function setSending(state) {
                    inFlight = state;
                    sendBtn.textContent = state ? "■" : "\\u27a4";
                    sendBtn.title = state ? "Stop" : "Send";
                }

                window.addEventListener("message", (event) => {
                    const msg = event.data;

                    // Status streaming (planner/agents)
                    if (msg.type === "status") {
                        const data = msg.data || {};
                        const text = data.message || "working…";
                        if (!thinkingBubble) showThinking();
                        if (thinkingStatusList && text !== lastStatus) {
                            const line = document.createElement("div");
                            line.className = "status-line";
                            line.textContent = text;
                            thinkingStatusList.appendChild(line);
                            log.scrollTop = log.scrollHeight;
                            lastStatus = text;
                        }
                        return;
                    }

                    // Risposte RPC
                    if (msg.type === "response") {
                        const data = msg.data || {};

                        // La risposta RPC è del tipo { ok, data: { plan }, errors }
                        const payload = data.data || data;
                        const plan = payload.plan || {};

                        // ignora risposte di richieste vecchie se abbiamo un id attivo
                        if (activeRequestId && data.id && data.id !== activeRequestId) {
                            return;
                        }
                        if (canceled) {
                            return;
                        }
                        setSending(false);
                        activeRequestId = null;

                        // Estrai un testo leggibile dalla struttura plan/steps/raw
                        const answer = payload.answer;
                        const fromActions = plan.raw?.actions?.[0]?.description;
                        const fromSteps = plan.steps?.[0]?.description;
                        const fallback = "Nessuna risposta disponibile.";
                        const text =
                            answer ||
                            fromActions ||
                            fromSteps ||
                            plan.goal ||
                            payload.message ||
                            JSON.stringify(payload, null, 2) ||
                            fallback;

                        // Se c'è il bubble di thinking, trasformalo in risposta finale
                        if (thinkingBubble) {
                            const bubble = thinkingBubble.querySelector(".bubble");
                            if (bubble) {
                                bubble.classList.remove("thinking");
                                bubble.textContent = text;
                            }
                            thinkingBubble = null;
                            thinkingStatusList = null;
                            lastStatus = "";
                        } else {
                            appendBubble(text, "bot");
                        }
                    }
                });
            </script>
        </body>
        </html>`;
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
