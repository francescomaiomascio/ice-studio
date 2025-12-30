import { Events } from "../../../../cortex-gui/app/core/events.js";

let cvId = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-analyze").onclick = parseRaw;
    document.getElementById("btn-html").onclick = renderHTML;
    document.getElementById("btn-pdf").onclick = exportPDF;
    document.getElementById("btn-clean").onclick = cleanup;
});

function parseRaw() {
    const text = document.getElementById("cv-text").value;

    window.iceStudio?.send({
        method: "cv.parse_raw",
        params: { text }
    });
}

Events.on("action:cv.parse_raw:result", (msg) => {
    cvId = msg.data.cv_id;

    fetch(msg.data.cv_json_path)
        .then(r => r.json())
        .then(j => {
            document.getElementById("preview").textContent = JSON.stringify(j, null, 2);
        });
});

function renderHTML() {
    if (!cvId) return;
    window.iceStudio?.send({ method: "cv.render_html", params: { cv_id: cvId } });
}

function exportPDF() {
    if (!cvId) return;
    window.iceStudio?.send({ method: "cv.export_pdf", params: { cv_id: cvId } });
}

function cleanup() {
    if (!cvId) return;
    window.iceStudio?.send({ method: "cv.cleanup", params: { cv_id: cvId } });
    document.getElementById("preview").textContent = "{}";
    cvId = null;
}
