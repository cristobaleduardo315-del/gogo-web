import { requireMerchant, hashPassword, verifyPassword } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function pageBody(merchant, { notice, error } = {}) {
  return `
    <div class="topbar"><div><h1>Configuración</h1><p>Datos de tu cuenta.</p></div></div>
    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}

    <div class="card" style="max-width:560px;margin-bottom:16px;">
      <div class="card-head"><div><h3>Cuenta</h3><div class="sub">Correo: ${escapeHtml(merchant.email)}</div></div></div>
      <form class="inline" method="POST" action="/panel/configuracion">
        <input type="hidden" name="action" value="account">
        <label>Nombre del negocio</label>
        <input name="business_name" required value="${escapeHtml(merchant.business_name)}">
        <label>Nueva contraseña (déjalo en blanco para no cambiarla)</label>
        <input name="new_password" type="password" minlength="8">
        <label>Contraseña actual (requerida para guardar)</label>
        <input name="current_password" type="password" required>
        <button class="btn" type="submit" style="margin-top:18px;">Guardar cuenta</button>
      </form>
    </div>

    ${
      merchant.lealtad_merchant_id
        ? `<p class="muted" style="max-width:560px;font-size:12.5px;">Los sellos, la recompensa, el color y el logo de tu tarjeta de fidelización se editan en <a href="/panel/fidelizacion">Fidelización</a>.</p>`
        : ""
    }`;
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  return html(renderShell({ title: "Configuración", active: "configuracion", merchant, bodyHtml: pageBody(merchant) }));
}

export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  const formData = await request.formData();
  const action = String(formData.get("action") || "");

  if (action === "account") {
    const currentPassword = String(formData.get("current_password") || "");
    if (!(await verifyPassword(currentPassword, merchant.password_hash, merchant.password_salt))) {
      return html(
        renderShell({
          title: "Configuración",
          active: "configuracion",
          merchant,
          bodyHtml: pageBody(merchant, { error: "Contraseña actual incorrecta." }),
        }),
        400
      );
    }
    const businessName = String(formData.get("business_name") || "").trim();
    const newPassword = String(formData.get("new_password") || "");
    if (newPassword && newPassword.length < 8) {
      return html(
        renderShell({
          title: "Configuración",
          active: "configuracion",
          merchant,
          bodyHtml: pageBody(merchant, { error: "La nueva contraseña debe tener al menos 8 caracteres." }),
        }),
        400
      );
    }
    if (newPassword) {
      const { hash, salt } = await hashPassword(newPassword);
      await env.DB.prepare("UPDATE web_merchants SET business_name = ?, password_hash = ?, password_salt = ? WHERE id = ?")
        .bind(businessName, hash, salt, merchant.id)
        .run();
    } else {
      await env.DB.prepare("UPDATE web_merchants SET business_name = ? WHERE id = ?").bind(businessName, merchant.id).run();
    }
    merchant.business_name = businessName;
    return html(
      renderShell({
        title: "Configuración",
        active: "configuracion",
        merchant,
        bodyHtml: pageBody(merchant, { notice: "Cambios guardados." }),
      })
    );
  }

  return new Response(null, { status: 302, headers: { Location: "/panel/configuracion" } });
}
