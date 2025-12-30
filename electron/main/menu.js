const { app, Menu, dialog } = require("electron");
const logger = require("./logger/logger.js");

function buildAppMenu(mainWindow) {
    const isMac = process.platform === "darwin";
    const template = [
        ...(isMac
            ? [{
                label: app.name,
                submenu: [
                    { role: "about" },
                    { type: "separator" },
                    { role: "services" },
                    { type: "separator" },
                    { role: "hide" },
                    { role: "hideOthers" },
                    { role: "unhide" },
                    { type: "separator" },
                    { role: "quit" },
                ],
            }]
            : []),
        {
            label: "File",
            submenu: isMac ? [{ role: "close" }] : [{ role: "quit" }],
        },
        {
            label: "Runtime",
            submenu: [
                {
                    label: "Switch Runtime…",
                    click: () => {
                        dialog
                            .showMessageBox(mainWindow, {
                                type: "question",
                                buttons: ["Switch", "Cancel"],
                                defaultId: 0,
                                cancelId: 1,
                                message: "Switch runtime?",
                                detail:
                                    "This will request a runtime switch. Teardown is not implemented yet.",
                            })
                            .then(({ response }) => {
                                if (response !== 0) return;
                                logger.logEvent("runtime_switch_requested");
                                if (mainWindow) {
                                    mainWindow.webContents.send(
                                        "runtime:switch-requested"
                                    );
                                }
                            })
                            .catch((err) => {
                                logger.logEvent(
                                    `runtime_switch_dialog_failed ${err?.message || String(err)}`
                                );
                            });
                    },
                },
            ],
        },
        {
            label: "View",
            submenu: [
                { role: "reload" },
                { role: "forceReload" },
                { role: "toggleDevTools" },
                { type: "separator" },
                { role: "resetZoom" },
                { role: "zoomIn" },
                { role: "zoomOut" },
                { type: "separator" },
                { role: "togglefullscreen" },
            ],
        },
        {
            label: "Window",
            submenu: [
                { role: "minimize" },
                { role: "zoom" },
                ...(isMac ? [{ type: "separator" }, { role: "front" }] : [{ role: "close" }]),
            ],
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Toggle DevTools",
                    accelerator: "CmdOrCtrl+Alt+I",
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

module.exports = { buildAppMenu };
