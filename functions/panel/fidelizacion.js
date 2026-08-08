import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
import {
  getLealtadSummary,
  getLealtadCustomers,
  getLealtadPromotions,
  sendLealtadPromotion,
} from "../lib/internalApi.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function promoRows(promotions) {
  if (!promotions.length) {
    return '<tr><td colspan="3" class="muted">Todavía no has enviado ninguna promoción.</td></tr>';
  }
  return promotions
    .map((p) => {
      const isSent = p.status === "sent";
      return `<tr>
        <td>${escapeHtml(formatDate(p.created_at))}</td>
        <td><strong>${escapeHtml(p.header)}</strong><div class="muted" style="font-size:12px;">${escapeHtml(p.body)}</div></td>
        <td style="color:${isSent ? "var(--lime-text)" : "var(--red)"};font-weight:700;">${isSent ? "Enviada" : "Error"}</td>
      </tr>`;
    })
    .join("");
}

function pageBody(merchant, { summary, customers, promotions, notice, error }) {
  const rows = customers
    .map(
      (c) => `<tr>
        <td><div class="cust-cell"><div class="cust-avatar">${escapeHtml((c.name || "?").slice(0, 2).toUpperCase())}</div>${escapeHtml(c.name)}</div></td>
        <td class="muted">${c.stamp_count} / ${summary ? summary.stamps_required : "-"}</td>
        <td class="muted">${escapeHtml(c.code)}</td>
      </tr>`
    )
    .join("");

  return `
    <div class="topbar">
      <div><h1>Fidelización</h1><p>${summary ? escapeHtml(summary.stamps_required + " sellos = " + summary.reward_text) : ""}</p></div>
      <a class="btn" href="/panel/fidelizacion/ir">Escanear cliente</a>
    </div>

    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}

    <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Clientes inscritos</span></div>
        <div class="kpi-value">${summary ? summary.customer_count : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Meta de sellos</span></div>
        <div class="kpi-value">${summary ? summary.stamps_required : "—"}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-head">
        <div><h3>Enviar promoción</h3><div class="sub">Llega como notificación push a quien tenga la tarjeta guardada en Google Wallet${summary ? ` (de tus ${summary.customer_count} clientes inscritos)` : ""}.</div></div>
      </div>
      <form class="inline" method="POST" action="/panel/fidelizacion">
        <label>Título</label>
        <input name="header" required maxlength="30" placeholder="Ej. 2x1 hoy">
        <label>Mensaje</label>
        <textarea name="body" required maxlength="300" placeholder="Ej. Trae a un amigo y ambos comen gratis en su segunda visita."></textarea>
        <button class="btn" type="submit" style="margin-top:18px;">Enviar notificación</button>
      </form>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-head"><div><h3>Historial de promociones</h3><div class="sub">Últimas enviadas</div></div></div>
      <table>
        <thead><tr><th>Fecha</th><th>Promoción</th><th>Estado</th></tr></thead>
        <tbody>${promoRows(promotions)}</tbody>
      </table>
    </div>

    <div class="card" data-wide>
      <div class="card-head">
        <div><h3>Clientes</h3><div class="sub">Los más recientes</div></div>
        <a class="btn ghost" href="/panel/fidelizacion/ir">Abrir panel completo</a>
      </div>
      <table>
        <thead><tr><th>Cliente</th><th>Sellos</th><th>Código</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" class="muted">Todavía no tienes clientes inscritos.</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function loadData(env, merchant) {
  const [summaryRes, customersRes, promosRes] = await Promise.all([
    getLealtadSummary(env, merchant.lealtad_merchant_id),
    getLealtadCustomers(env, merchant.lealtad_merchant_id),
    getLealtadPromotions(env, merchant.lealtad_merchant_id),
  ]);
  return {
    summary: summaryRes.ok ? summaryRes.data : null,
    customers: customersRes.ok ? customersRes.data.customers || [] : [],
    promotions: promosRes.ok ? promosRes.data.promotions || [] : [],
  };
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  if (!merchant.lealtad_merchant_id) {
    const body = `
      <div class="topbar"><div><h1>Fidelización</h1><p>Tu programa de sellos.</p></div></div>
      <div class="card"><p class="muted">Tu cuenta todavía no tiene un programa de fidelización vinculado. Escríbenos para activarlo.</p></div>`;
    return html(renderShell({ title: "Fidelización", active: "fidelizacion", merchant, bodyHtml: body }));
  }

  const data = await loadData(env, merchant);
  return html(renderShell({ title: "Fidelización", active: "fidelizacion", merchant, bodyHtml: pageBody(merchant, data) }));
}

export async function onRequestPost(context) {
  // DEBUG TEMPORAL: envolvemos TODO el handler (incluyendo requireMerchant y
  // el parseo del form) para capturar y mostrar cualquier error real en vez
  // de dejar que Cloudflare lo convierta en un 502 "Host Error" genérico sin
  // detalle. Se retira en cuanto encontremos la causa raíz.
  try {
    // DEBUG TEMPORAL 2: aislar si CUALQUIER fetch saliente síncrono durante
    // un POST por el dominio custom truena, probando contra un host externo
    // trivial antes de tocar nuestra lógica real.
    try {
      const pingController = new AbortController();
      const pingTimeout = setTimeout(() => pingController.abort(), 8000);
      const pingRes = await fetch("https://example.com/", { signal: pingController.signal });
      clearTimeout(pingTimeout);
      return new Response("DEBUG PING OK: status=" + pingRes.status, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (pingErr) {
      return new Response(
        "DEBUG PING FAILED:\n" + (pingErr && pingErr.stack ? pingErr.stack : String(pingErr)),
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
  } catch (err) {
    console.error("POST /panel/fidelizacion (debug):", err && err.stack ? err.stack : err);
    return new Response("DEBUG ERROR:\n" + (err && err.stack ? err.stack : String(err)), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function handlePost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  if (!merchant.lealtad_merchant_id) {
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion" } });
  }

  const formData = await request.formData();
  const header = String(formData.get("header") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!header || !body) {
    const data = await loadData(env, merchant);
    return html(
      renderShell({
        title: "Fidelización",
        active: "fidelizacion",
        merchant,
        bodyHtml: pageBody(merchant, { ...data, error: "Completa el título y el mensaje." }),
      }),
      400
    );
  }

  const result = await sendLealtadPromotion(env, merchant.lealtad_merchant_id, { header, body });
  const data = await loadData(env, merchant);
  return html(
    renderShell({
      title: "Fidelización",
      active: "fidelizacion",
      merchant,
      bodyHtml: pageBody(merchant, {
        ...data,
        notice: result.ok ? "Promoción enviada." : undefined,
        error: result.ok ? undefined : result.data?.error || "No se pudo enviar la notificación.",
      }),
    }),
    result.ok ? 200 : 502
  );
}
