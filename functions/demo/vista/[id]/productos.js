// GET /demo/vista/:id/productos — página de productos del demo (se abre al
// tocar "Ver menú"/"Ver catálogo" en el home, functions/demo/vista/[id].js).
// Separada del home a propósito: Cristobal pidió que el home solo tenga el
// logo y los botones, y que ver el menú/catálogo lleve a otra página.

import { getLead } from "../../../lib/demoData.js";
import { renderDemoProducts } from "../../../lib/demoRender.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function notFound() {
  return html(
    `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vista previa no encontrada — GoGo</title></head>
    <body style="font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;">
    <div><h1>No encontramos esta vista previa</h1><p>Puede que el enlace esté mal escrito. <a href="/demo">Prueba el demo de nuevo</a>.</p></div>
    </body></html>`,
    404
  );
}

export async function onRequestGet({ params, env }) {
  const data = await getLead(env.DB, String(params.id || ""));
  if (!data) return notFound();

  if (data.lead.converted_merchant_id) {
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  const activateUrl = `/registro?plan=start&demo=${encodeURIComponent(data.lead.id)}`;
  const backUrl = `/demo/vista/${encodeURIComponent(data.lead.id)}`;
  return html(renderDemoProducts(data, { activateUrl, backUrl }));
}
