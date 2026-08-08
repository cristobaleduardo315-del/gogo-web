import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function pageBody(merchant, page, { notice, error } = {}) {
  const p = page || {};
  return `
    <div class="topbar">
      <div><h1>Mi página</h1><p>El perfil público de tu negocio.</p></div>
    </div>
    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <div class="card" style="max-width:560px;">
      <form class="inline" method="POST" action="/panel/mi-pagina">
        <label>Título</label>
        <input name="headline" value="${escapeHtml(p.headline || "")}" placeholder="Ej. Las mejores hamburguesas de la ciudad">
        <label>Descripción</label>
        <textarea name="description" placeholder="Cuéntale a tus clientes de qué se trata tu negocio.">${escapeHtml(p.description || "")}</textarea>
        <label>Dirección</label>
        <input name="address" value="${escapeHtml(p.address || "")}">
        <label>Teléfono</label>
        <input name="phone" value="${escapeHtml(p.phone || "")}">
        <label>Horario</label>
        <textarea name="hours" placeholder="Ej. Lun-Sáb 11am-9pm">${escapeHtml(p.hours_json || "")}</textarea>
        <button class="btn" type="submit" style="margin-top:18px;">Guardar cambios</button>
      </form>
    </div>`;
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  const page = await env.DB.prepare("SELECT * FROM business_page WHERE merchant_id = ?").bind(merchant.id).first();
  return html(renderShell({ title: "Mi página", active: "mi-pagina", merchant, bodyHtml: pageBody(merchant, page) }));
}

export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  const formData = await request.formData();
  const headline = String(formData.get("headline") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const hours = String(formData.get("hours") || "").trim();

  await env.DB.prepare(
    `INSERT INTO business_page (merchant_id, headline, description, address, phone, hours_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(merchant_id) DO UPDATE SET
       headline = excluded.headline,
       description = excluded.description,
       address = excluded.address,
       phone = excluded.phone,
       hours_json = excluded.hours_json,
       updated_at = excluded.updated_at`
  )
    .bind(merchant.id, headline, description, address, phone, hours, Date.now())
    .run();

  const page = { headline, description, address, phone, hours_json: hours };
  return html(
    renderShell({
      title: "Mi página",
      active: "mi-pagina",
      merchant,
      bodyHtml: pageBody(merchant, page, { notice: "Cambios guardados." }),
    })
  );
}
