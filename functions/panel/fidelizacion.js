import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
import { getLealtadSummary, getLealtadCustomers } from "../lib/internalApi.js";

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  if (!merchant.lealtad_merchant_id) {
    const body = `
      <div class="topbar"><div><h1>Fidelización</h1><p>Tu programa de sellos.</p></div></div>
      <div class="card"><p class="muted">Tu cuenta todavía no tiene un programa de fidelización vinculado. Escríbenos para activarlo.</p></div>`;
    return new Response(renderShell({ title: "Fidelización", active: "fidelizacion", merchant, bodyHtml: body }), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const [summaryRes, customersRes] = await Promise.all([
    getLealtadSummary(env, merchant.lealtad_merchant_id),
    getLealtadCustomers(env, merchant.lealtad_merchant_id),
  ]);
  const summary = summaryRes.ok ? summaryRes.data : null;
  const customers = customersRes.ok ? customersRes.data.customers || [] : [];

  const rows = customers
    .map(
      (c) => `<tr>
        <td><div class="cust-cell"><div class="cust-avatar">${escapeHtml((c.name || "?").slice(0, 2).toUpperCase())}</div>${escapeHtml(c.name)}</div></td>
        <td class="muted">${c.stamp_count} / ${summary ? summary.stamps_required : "-"}</td>
        <td class="muted">${escapeHtml(c.code)}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="topbar">
      <div><h1>Fidelización</h1><p>${summary ? escapeHtml(summary.stamps_required + " sellos = " + summary.reward_text) : ""}</p></div>
      <a class="btn" href="/panel/fidelizacion/ir">Escanear cliente</a>
    </div>

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

  return new Response(renderShell({ title: "Fidelización", active: "fidelizacion", merchant, bodyHtml: body }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
