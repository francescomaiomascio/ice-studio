const path = require("path");
const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { spawn } = require("child_process");
const fetch = globalThis.fetch;
if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in Electron main");
}
const logger = require("./logger/logger.js");
const {
    initMainLogger,
    logEvent: mainLogEvent,
    switchPhase: switchLogPhase,
} = require("./logger/logger.js");
const { buildAppMenu } = require("./menu.js");
const { registerPrebootLogger } = require("./logger/preboot-logger.js");
const { createRendererLogSink } = require("./logger/renderer-log-sink.js");
const guiWsClient = require("./ws/GuiWSClient.js");

require("./ws/GuiWSClient.js");

let mainWindow = null;
let windowReadyToShow = false;
let rendererReady = false;
let rendererReadyTimer = null;
let isQuitting = false;
let devToolsWindow = null;
let runtimeChild = null;
const ICON_PATH = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "node_modules",
    "ice-theme-core",
    "assets",
    "icons",
    "brands",
    "electron",
    "icon.png"
);
const RENDERER_READY_TIMEOUT_MS = Number(process.env.ICE_STUDIO_RENDERER_READY_TIMEOUT || 6000);
const DEVTOOLS_WIDTH = Number(process.env.ICE_STUDIO_DEVTOOLS_WIDTH || 520);
const DEVTOOLS_HEIGHT = Number(process.env.ICE_STUDIO_DEVTOOLS_HEIGHT || 720);


function getRendererEntry() {
    const devUrl = process.env.ICE_STUDIO_DEV_SERVER_URL;
    if (devUrl && /^https?:\/\//.test(devUrl)) {
        return devUrl;
    }
    return path.join(__dirname, "..", "renderer", "index.html");
}

function createMainWindow() {
    const preloadPath = path.join(__dirname, "..", "preload", "preload.js");
    logger.logEvent(`[WINDOW] Creating BrowserWindow preload=${preloadPath}`);

    const windowOptions = {
        width: 1280,
        height: 800,
        frame: false,
        titleBarStyle: "hidden",
        backgroundColor: "#0b1020",
        show: false,
        webPreferences: {
            preload: preloadPath,
        },
    };
    const win = new BrowserWindow(windowOptions);
    console.log("[WINDOW RAW OPTIONS]", {
        frame: win.isFrameless?.() ?? "unknown",
        titleBarStyle: win.getTitle?.() ?? "unknown",
    });

    const entry = getRendererEntry();
    if (entry.startsWith("http://") || entry.startsWith("https://")) {
        win.loadURL(entry).catch((err) => {
            logger.logEvent(
                `[ERROR] [WINDOW] Failed to load URL ${err?.message || String(err)}`
            );
        });
    } else {
        win.loadFile(entry).catch((err) => {
            logger.logEvent(
                `[ERROR] [WINDOW] Failed to load file ${err?.message || String(err)}`
            );
        });
    }

    win.once("ready-to-show", () => {
        logger.logEvent("[WINDOW] ready-to-show");
        windowReadyToShow = true;
        tryShowWindow();
    });
    win.on("close", () => {
        if (isQuitting) {
            return;
        }
        logger.logEvent("[WINDOW] close requested");
        isQuitting = true;
        app.quit();
    });
    if (rendererReadyTimer) {
        clearTimeout(rendererReadyTimer);
    }
    rendererReadyTimer = setTimeout(() => {
        if (rendererReady) {
            return;
        }
        logger.logEvent("[WARN] [WINDOW] renderer-ready timeout reached, forcing show");
        rendererReady = true;
        tryShowWindow();
    }, RENDERER_READY_TIMEOUT_MS);

    win.on("closed", () => {
        logger.logEvent("[WINDOW] closed");
        if (devToolsWindow && !devToolsWindow.isDestroyed()) {
            devToolsWindow.destroy();
            devToolsWindow = null;
        }
        if (mainWindow === win) {
            mainWindow = null;
            windowReadyToShow = false;
            rendererReady = false;
            if (rendererReadyTimer) {
                clearTimeout(rendererReadyTimer);
                rendererReadyTimer = null;
            }
        }
    });

    win.webContents.on("context-menu", (_event, params) => {
        const template = [
            { role: "cut", enabled: params.editFlags.canCut },
            { role: "copy", enabled: params.editFlags.canCopy },
            { role: "paste", enabled: params.editFlags.canPaste },
            { type: "separator" },
            { role: "selectAll" },
        ].filter((item, index, arr) => {
            if (item.type === "separator") {
                return index !== 0 && index !== arr.length - 1;
            }
            return item.enabled !== false;
        });

        if (template.length) {
            Menu.buildFromTemplate(template).popup({ window: win });
        }
    });

    attachDevToolsShortcut(win);
    return win;
}

function configureDevToolsDock(win) {
    if (!win || win.__iceDevtoolsConfigured) {
        return;
    }
    win.__iceDevtoolsConfigured = true;

    devToolsWindow = new BrowserWindow({
        width: DEVTOOLS_WIDTH,
        height: DEVTOOLS_HEIGHT,
        show: false,
        parent: win,
        autoHideMenuBar: true,
        useContentSize: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    devToolsWindow.on("close", (event) => {
        if (win.webContents && win.webContents.isDevToolsOpened()) {
            event.preventDefault();
            win.webContents.closeDevTools();
        }
    });

    devToolsWindow.on("closed", () => {
        devToolsWindow = null;
    });

    win.webContents.setDevToolsWebContents(devToolsWindow.webContents);

    devToolsWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
        if (sourceId?.startsWith("devtools://") && message?.includes("Autofill.")) {
            event.preventDefault();
        }
    });

    win.webContents.on("devtools-opened", () => {
        if (!devToolsWindow || devToolsWindow.isDestroyed()) {
            return;
        }
        const hostBounds = win.getBounds();
        const height = Math.min(DEVTOOLS_HEIGHT, hostBounds.height);
        devToolsWindow.setSize(DEVTOOLS_WIDTH, height);
        devToolsWindow.setPosition(
            hostBounds.x + hostBounds.width - DEVTOOLS_WIDTH,
            hostBounds.y,
            false
        );
        devToolsWindow.show();
        devToolsWindow.focus();
    });

    win.webContents.on("devtools-closed", () => {
        if (devToolsWindow && !devToolsWindow.isDestroyed()) {
            devToolsWindow.hide();
        }
    });
}

function attachDevToolsShortcut(win) {
    if (!win || win.__iceDevShortcutAttached) {
        return;
    }
    win.__iceDevShortcutAttached = true;
    win.webContents.on("before-input-event", (event, input) => {
        if (input.type !== "keyDown") return;
        const key = (input.key || "").toLowerCase();
        const isCmdOrCtrl = process.platform === "darwin" ? input.meta : input.control;
        if (isCmdOrCtrl && input.alt && key === "i") {
            event.preventDefault();
            win.webContents.toggleDevTools();
        }
    });
}

function tryShowWindow() {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) return;
    if (!windowReadyToShow) return;
    if (!rendererReady) return;
    mainWindow.show();
}

function registerIpcHandlers() {
    registerPrebootLogger(ipcMain);
    const rendererLogSink = createRendererLogSink();

    ipcMain.handle("system:status", async () => {
        try {
            const res = await fetch("http://127.0.0.1:7030/system/status");
            return res.json();
        } catch (err) {
            return {
                ok: false,
                error: err?.message || String(err),
            };
        }
    });

    ipcMain.handle("system:start", async () => {
        try {
            const res = await fetch("http://127.0.0.1:7030/system/start", {
                method: "POST",
            });
            return res.json();
        } catch (err) {
            return {
                ok: false,
                error: err?.message || String(err),
            };
        }
    });

    ipcMain.handle("launch-ice-runtime", async () => {
        const projectRoot = process.env.ICE_STUDIO_PROJECT_ROOT || process.cwd();
        const child = spawn("node", ["tools/runtime/launch-ice.js"], {
            cwd: projectRoot,
            env: process.env,
            stdio: "inherit",
        });
        runtimeChild = child;
        child.on("exit", (code) => {
            logger.logEvent(`[MAIN] ICE runtime exited code=${code}`);
            if (runtimeChild === child) {
                runtimeChild = null;
            }
        });
        return { ok: true };
    });

    ipcMain.handle("runtime:enter", async () => {
        process.env.ICE_PHASE = "runtime";
        switchLogPhase("runtime");

        // qui in futuro:
        // start backend
        // start llm

        return { ok: true };
    });

    ipcMain.handle("snowball:launch", async (_event, payload) => {
        logger.logEvent(`[SNOWBALL] launch requested ${JSON.stringify(payload || {})}`);
        return { ok: true };
    });

    ipcMain.on("log:event", (_event, payload) => {
        rendererLogSink(payload);
        const rawData = payload?.data;
        const phase =
            payload?.phase ||
            (rawData && typeof rawData === "object" ? rawData.phase : undefined);
        let data = rawData ?? payload;
        if (phase) {
            if (rawData && typeof rawData === "object") {
                data = { ...rawData, phase };
            } else {
                data = { phase, data: rawData ?? payload };
            }
        }
        const normalized = {
            ts: payload?.ts || new Date().toISOString(),
            level: (payload?.level || payload?.lvl || "INFO").toUpperCase(),
            domain: payload?.domain || "ui",
            owner: payload?.owner || "renderer",
            scope: payload?.scope || payload?.layer || "renderer",
            msg: payload?.msg || payload?.message || "renderer_log",
            data,
            runtime_id: payload?.runtime_id || process.env.ICE_RUNTIME_ID || null,
        };
        guiWsClient.send({ type: "log:event", payload: normalized });
    });

    ipcMain.on("preboot:ui-ready", () => {
        rendererReady = true;
        if (rendererReadyTimer) {
            clearTimeout(rendererReadyTimer);
            rendererReadyTimer = null;
        }
        logger.logEvent("[MAIN] Renderer signaled preboot UI ready");
        tryShowWindow();
    });

    ipcMain.on("win:minimize", () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });

    ipcMain.on("win:maximize", () => {
        if (!mainWindow) return;
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on("win:close", () => {
        console.log("[WINDOW] Quit requested from UI");
        app.quit();
    });
}

function onReady() {
    if (!process.env.ICE_LAUNCH_DIR) {
        throw new Error("ICE_LAUNCH_DIR missing — Electron cannot start");
    }
    const runtimeId = path.basename(process.env.ICE_LAUNCH_DIR);
    if (!initMainLogger()) {
        console.error("Electron logging disabled — runtime/ui not ready");
    }
    mainLogEvent("electron.ready");
    logger.logEvent("[MAIN] Electron ready");
    global.ICE_RUNTIME_ID = runtimeId;
    app.on("before-quit", () => {
        if (!runtimeChild) {
            return;
        }
        try {
            runtimeChild.kill("SIGTERM");
        } catch (err) {
            logger.logEvent(
                `[WARN] [MAIN] Failed to terminate ICE runtime ${err?.message || String(err)}`
            );
        }
    });
    if (process.platform === "darwin") {
        if (app.dock && ICON_PATH) {
            try {
                app.dock.setIcon(ICON_PATH);
            } catch (err) {
                logger.logEvent(
                    `[WARN] [MAIN] Failed to set dock icon ${err?.message || String(err)}`
                );
            }
        }
    }
    registerIpcHandlers();
    mainWindow = createMainWindow();
    buildAppMenu(mainWindow);
}

app.whenReady().then(onReady).catch((err) => {
    logger.logEvent(`[ERROR] [MAIN] Failed to start ${err?.message || String(err)}`);
});
app.commandLine.appendSwitch("disable-features", "MacAppStore");

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
    }
});

app.on("before-quit", () => {
    console.log("[APP] before-quit");
});

app.on("will-quit", () => {
    console.log("[APP] will-quit");
});
