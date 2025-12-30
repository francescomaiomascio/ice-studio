const { contextBridge, ipcRenderer } = require("electron");

const MODE = process.env.ICE_STUDIO_MODE || "preboot";
const PREBOOT_BASE = process.env.ICE_STUDIO_PREBOOT_BASE || "http://127.0.0.1:7040";

contextBridge.exposeInMainWorld("__ICE_STUDIO_MODE__", MODE);
contextBridge.exposeInMainWorld("__ICE_STUDIO_PREBOOT_BASE__", PREBOOT_BASE);
contextBridge.exposeInMainWorld("__ICE_PHASE__", process.env.ICE_PHASE || null);
contextBridge.exposeInMainWorld("__ICE_PLATFORM__", {
    platform: process.platform,
});
contextBridge.exposeInMainWorld("__ICE_RUNTIME_ID__", process.env.ICE_RUNTIME_ID || null);
contextBridge.exposeInMainWorld("__ICE_LOG_RENDERER__", (event) => {
    ipcRenderer.send("log:event", event);
});

contextBridge.exposeInMainWorld("ICE_SYSTEM", {
    status: () => ipcRenderer.invoke("system:status"),
    start: () => ipcRenderer.invoke("system:start"),
});

contextBridge.exposeInMainWorld("electronAPI", {
    prebootLog: (payload) => ipcRenderer.send("preboot:log", payload),
    snowballLaunch: (payload) => ipcRenderer.invoke("snowball:launch", payload),
    prebootReady: () => ipcRenderer.send("preboot:ui-ready"),
    launchIceRuntime: () => ipcRenderer.invoke("launch-ice-runtime"),
    runtimeEnter: () => ipcRenderer.invoke("runtime:enter"),
});

contextBridge.exposeInMainWorld("electronLogger", {
    log: (entry) => ipcRenderer.send("logger:append", entry),
});

contextBridge.exposeInMainWorld("api", {
    window: {
        minimize: () => ipcRenderer.send("win:minimize"),
        maximize: () => ipcRenderer.send("win:maximize"),
        close: () => ipcRenderer.send("win:close"),
    },
});
