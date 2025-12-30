import * as vscode from "vscode";
import { IceStudioClient } from "./client/IceClient";
import { ChatPanel } from "./panels/ChatPanel";

let client: IceStudioClient | null = null;

export function activate(context: vscode.ExtensionContext) {
    const endpoint = "ws://127.0.0.1:7030/ide";

    client = new IceStudioClient(endpoint);

    // ----------------------------
    // View: ICE Studio Chat
    // ----------------------------
    const chatProvider = new ChatViewProvider(client);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("iceStudio.chat", chatProvider)
    );

    // ----------------------------
    // Comando: Connect manuale
    // ----------------------------
    const connectCmd = vscode.commands.registerCommand(
        "iceStudio.connect",
        () => {
            client?.connect();
            vscode.window.showInformationMessage("ICE Studio IDE: connecting…");
        }
    );

    context.subscriptions.push(connectCmd);

    // ----------------------------
    // Setup listener eventi dal backend
    // ----------------------------
    client.on("message", async (data: any) => {
        if (!data || !data.type) return;

        switch (data.type) {
            case "open_project":
                await handleOpenProject(data);
                break;

            case "open_file":
                await handleOpenFile(data);
                break;

            // altri event types…
        }
    });

    client.on("connected", () => {
        vscode.window.showInformationMessage("ICE Studio IDE: connected to backend");
    });

    client.on("disconnected", () => {
        vscode.window.showWarningMessage("ICE Studio IDE: disconnected");
    });

    client.on("error", (msg) => {
        vscode.window.showErrorMessage("ICE Studio backend error: " + msg);
    });

    // ----------------------------
    // Auto-connect all’avvio
    // ----------------------------
    client.connect();
}

export function deactivate() {
    if (client) {
        client.dispose();
        client = null;
    }
}

async function handleOpenProject(data: any) {
    try {
        const uri = vscode.Uri.file(data.root);

        await vscode.commands.executeCommand(
            "vscode.openFolder",
            uri,
            { forceNewWindow: false }
        );

        vscode.window.showInformationMessage(
            `ICE Studio: workspace aperto → ${data.root}`
        );

    } catch (err) {
        vscode.window.showErrorMessage("ICE Studio IDE: errore apertura workspace");
        console.error(err);
    }
}

async function handleOpenFile(data: any) {
    try {
        const uri = vscode.Uri.file(data.path);
        const encoder = new TextEncoder();
        const content = data.content || "";

        await vscode.workspace.fs.writeFile(uri, encoder.encode(content));

        await vscode.window.showTextDocument(uri, { preview: false });

    } catch (err) {
        vscode.window.showErrorMessage("ICE Studio IDE: errore apertura file");
        console.error(err);
    }
}

class ChatViewProvider implements vscode.WebviewViewProvider {
    constructor(private client: IceStudioClient) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        new ChatPanel(webviewView, this.client);
    }
}
