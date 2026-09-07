// GET /demo — wizard público del "demo rápido" (sin login). Ver
// functions/lib/demoRender.js y functions/demo/crear.js.

import { renderDemoWizard } from "./lib/demoRender.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function onRequestGet() {
  return html(renderDemoWizard());
}
