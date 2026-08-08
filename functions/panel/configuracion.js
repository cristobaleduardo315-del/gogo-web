import { requireMerchant, hashPassword, verifyPassword } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
import { getLealtadConfig, updateLealtadConfig } from "../lib/internalApi.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function pageBody(merchant, lealtadConfig, { notice, error } = {}) {
  const lc = lealtadConfig || {};
  return `
    <div class="topbar"><div><h1>Configuración</h1><p>Datos de tu cuenta y de tu programa de fidelización.</p></div></div>
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
        ? `<div class="card" style="max-width:560px;">
      <div class="card-head"><div><h3>Programa de fidelización</h3><div class="sub">Sellos y recompensa</div></div></div>
      <form class="inline" method="POST" action="/panel/configuracion">
        <input type="hidden" name="action" value="lealtad">
        <label>Sellos necesarios para la recompensa</label>
        <input name="stamps_required" type="number" min="1" max="50" required value="${lc.stamps_required || 10}">
        <label>Descripción de la recompensa</label>
        <input name="reward_text" required value="${escapeHtml(lc.reward_text || "")}">
        <label>Color de marca</label>
        <input name="brand_color" type="color" value="${escapeHtml(lc.brand_color || "#ccff00")}" style="height:44px;padding:4px;">
        <button class="btn" type="submit" style="margin-top:18px;">Guardar fidelización</button>
      </form>
      <p class="muted" style="margin-top:14px;font-size:12.5px;">Para subir logo o ícono de sello, <a href="/panel/fidelizacion/ir">abre el panel completo de fidelización</a>.</p>
    </div>`
        : ""
    }`;
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  let lealtadConfig = null;
  if (merchant.lealtad_merchant_id) {
    const res = await getLealtadConfig(env, merchant.lealtad_merchant_id);
    if (res.ok) lealtadConfig = res.data;
  }
  return html(renderShell({ title: "Configuración", active: "configuracion", merchant, bodyHtml: pageBody(merchant, lealtadConfig) }));
}

export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  const formData = await request.formData();
  const action = String(formData.get("action") || "");

  if (action === "account") {
    const currentPassword = String(formData.get("current_password") || "");
    if (!(await verifyPassword(currentPassword, merchant.password_hash, merchant.password_salt))) {
      const lealtadConfig = merchant.lealtad_merchant_id ? (await getLealtadConfig(env, merchant.lealtad_merchant_id)).data : null;
      return html(
        renderShell({
          title: "Configuración",
          active: "configuracion",
          merchant,
          bodyHtml: pageBody(merchant, lealtadConfig, { error: "Contraseña actual incorrecta." }),
        }),
        400
      );
    }
    const businessName = String(formData.get("business_name") || "").trim();
    const newPassword = String(formData.get("new_password") || "");
    if (newPassword && newPassword.length < 8) {
      const lealtadConfig = merchant.lealtad_merchant_id ? (await getLealtadConfig(env, merchant.lealtad_merchant_id)).data : null;
      return html(
        renderShell({
          title: "Configuración",
          active: "configuracion",
          merchant,
          bodyHtml: pageBody(merchant, lealtadConfig, { error: "La nueva contraseña debe tener al menos 8 caracteres." }),
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
    const lealtadConfig = merchant.lealtad_merchant_id ? (await getLealtadConfig(env, merchant.lealtad_merchant_id)).data : null;
    return html(
      renderShell({
        title: "Configuración",
        active: "configuracion",
        merchant,
        bodyHtml: pageBody(merchant, lealtadConfig, { notice: "Cambios guardados." }),
      })
    );
  }

  if (action === "lealtad" && merchant.lealtad_merchant_id) {
    const stampsRequired = parseInt(formData.get("stamps_required"), 10);
    const rewardText = String(formData.get("reward_text") || "").trim();
    const brandColor = String(formData.get("brand_color") || "#ccff00");
    await updateLealtadConfig(env, merchant.lealtad_merchant_id, {
      business_name: merchant.business_name,
      stamps_required: stampsRequired,
      reward_text: rewardText,
      brand_color: brandColor,
    });
    const lealtadConfig = { stamps_required: stampsRequired, reward_text: rewardText, brand_color: brandColor };
    return html(
      renderShell({
        title: "Configuración",
        active: "configuracion",
        merchant,
        bodyHtml: pageBody(merchant, lealtadConfig, { notice: "Cambios guardados." }),
      })
    );
  }

  return new Response(null, { status: 302, headers: { Location: "/panel/configuracion" } });
}
