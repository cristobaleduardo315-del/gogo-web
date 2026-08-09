import { requireMerchant } from "../../../lib/auth.js";
import { renderShell, escapeHtml } from "../../../lib/layout.js";
import {
  getLealtadCustomer,
  stampLealtadCustomer,
  redeemLealtadCustomer,
  deleteLealtadCustomer,
} from "../../../lib/internalApi.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function pageBody(customer, cardUrl, { notice, error } = {}) {
  const rewardAvailable = customer.rewardAvailable;
  return `
    <div class="topbar">
      <div><h1>${escapeHtml(customer.customerName)}</h1><p>${escapeHtml(customer.contact || "Sin contacto registrado")}</p></div>
      <a class="btn ghost" href="/panel/fidelizacion">← Volver a Fidelización</a>
    </div>

    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}

    <div class="kpi-grid kpi-grid-2">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Sellos actuales</span></div>
        <div class="kpi-value">${customer.stampCount}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Meta</span></div>
        <div class="kpi-value">${customer.stampsRequired}</div>
      </div>
    </div>

    ${rewardAvailable ? `<div class="notice" style="margin-bottom:16px;">¡Meta alcanzada! Ya puede canjear su recompensa.</div>` : ""}

    <div class="card" style="max-width:480px;margin-bottom:16px;">
      <div class="card-head"><div><h3>Ajustar sellos</h3><div class="sub">Sumar o quitar sellos a mano</div></div></div>
      <form class="inline" method="POST">
        <input type="hidden" name="action" value="ajustar">
        <label>Cantidad</label>
        <input name="quantity" type="number" min="1" max="50" value="1" required>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="btn" type="submit" name="direction" value="add" style="flex:1;">+ Agregar</button>
          <button class="btn ghost" type="submit" name="direction" value="remove" style="flex:1;">− Quitar</button>
        </div>
      </form>
    </div>

    ${
      rewardAvailable
        ? `<div class="card" style="max-width:480px;margin-bottom:16px;">
      <form method="POST">
        <input type="hidden" name="action" value="canjear">
        <button class="btn" type="submit" style="width:100%;">Canjear recompensa</button>
      </form>
    </div>`
        : ""
    }

    <div class="card" style="max-width:480px;">
      <div class="card-head"><div><h3>Tarjeta del cliente</h3><div class="sub">Código: ${escapeHtml(customer.code)}</div></div></div>
      <a class="btn ghost" href="${escapeHtml(cardUrl)}" target="_blank" rel="noopener" style="display:block;text-align:center;">Ver tarjeta pública</a>
    </div>

    <div class="card" style="max-width:480px;margin-top:16px;border-color:#e6a5a0;">
      <div class="card-head"><div><h3>Eliminar cliente</h3><div class="sub">Borra su historial de sellos y desactiva su pase de Wallet. No se puede deshacer.</div></div></div>
      <form method="POST" onsubmit="return confirm('¿Eliminar a ${escapeHtml(customer.customerName).replace(/'/g, "\\'")}? Esta acción no se puede deshacer.');">
        <input type="hidden" name="action" value="eliminar">
        <button class="btn ghost" type="submit" style="width:100%;color:#c0392b;border-color:#c0392b;">Eliminar cliente</button>
      </form>
    </div>`;
}

async function loadCustomer(env, merchant, code) {
  const res = await getLealtadCustomer(env, merchant.lealtad_merchant_id, code);
  return res.ok ? res.data : null;
}

export async function onRequestGet({ request, env, params }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  if (!merchant.lealtad_merchant_id) {
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion" } });
  }

  const customer = await loadCustomer(env, merchant, params.code);
  if (!customer) {
    return html(
      renderShell({
        title: "Cliente",
        active: "fidelizacion",
        merchant,
        bodyHtml: `<div class="topbar"><div><h1>Cliente no encontrado</h1></div></div><div class="card"><p class="muted">Este código no corresponde a un cliente tuyo. <a href="/panel/fidelizacion">Volver</a></p></div>`,
      }),
      404
    );
  }

  const url = new URL(request.url);
  const notice = url.searchParams.get("notice") || undefined;
  const error = url.searchParams.get("error") || undefined;
  const cardUrl = `${(env.GOGO_LEALTAD_URL || "").replace(/\/$/, "")}/tarjeta/${customer.code}`;

  return html(
    renderShell({
      title: customer.customerName,
      active: "fidelizacion",
      merchant,
      bodyHtml: pageBody(customer, cardUrl, { notice, error }),
    })
  );
}

export async function onRequestPost({ request, env, params }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  if (!merchant.lealtad_merchant_id) {
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion" } });
  }

  const code = params.code;
  const formData = await request.formData();
  const action = String(formData.get("action") || "");
  const backTo = (qs) => new Response(null, { status: 302, headers: { Location: `/panel/fidelizacion/cliente/${encodeURIComponent(code)}${qs ? "?" + qs : ""}` } });

  if (action === "ajustar") {
    const quantity = parseInt(formData.get("quantity"), 10) || 1;
    const direction = formData.get("direction") === "remove" ? "remove" : "add";
    const result = await stampLealtadCustomer(env, merchant.lealtad_merchant_id, { code, quantity, direction, source: "manual" });
    if (!result.ok) {
      return backTo("error=" + encodeURIComponent(result.data?.error || "No se pudo ajustar."));
    }
    return backTo("notice=" + encodeURIComponent("Sellos actualizados."));
  }

  if (action === "canjear") {
    const result = await redeemLealtadCustomer(env, merchant.lealtad_merchant_id, code);
    if (!result.ok) {
      return backTo("error=" + encodeURIComponent(result.data?.error || "No se pudo canjear."));
    }
    return backTo("notice=" + encodeURIComponent("Recompensa canjeada."));
  }

  if (action === "eliminar") {
    const result = await deleteLealtadCustomer(env, merchant.lealtad_merchant_id, code);
    if (!result.ok) {
      return backTo("error=" + encodeURIComponent(result.data?.error || "No se pudo eliminar."));
    }
    const qs = "notice=" + encodeURIComponent("Cliente eliminado.");
    return new Response(null, { status: 302, headers: { Location: `/panel/fidelizacion?${qs}` } });
  }

  return backTo();
}
