import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
import { getLealtadSummary, getLealtadCustomers } from "../lib/internalApi.js";

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  let summary = null;
  let customers = [];
  if (merchant.lealtad_merchant_id) {
    const [summaryRes, customersRes] = await Promise.all([
      getLealtadSummary(env, merchant.lealtad_merchant_id),
      getLealtadCustomers(env, merchant.lealtad_merchant_id),
    ]);
    if (summaryRes.ok) summary = summaryRes.data;
    if (customersRes.ok) customers = (customersRes.data.customers || []).slice(0, 6);
  }

  const rows = customers
    .map(
      (c) => `<tr>
        <td><div class="cust-cell"><div class="cust-avatar">${escapeHtml((c.name || "?").slice(0, 2).toUpperCase())}</div>${escapeHtml(c.name)}</div></td>
        <td class="muted">${c.stamp_count} / ${summary ? summary.stamps_required : "-"}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="topbar">
      <div>
        <h1>Hola, ${escapeHtml(merchant.business_name)}</h1>
        <p>Así va tu negocio en GoGo</p>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Clientes en fidelización</span></div>
        <div class="kpi-value">${summary ? summary.customer_count : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Meta de sellos</span></div>
        <div class="kpi-value">${summary ? summary.stamps_required : "—"}</div>
        <div class="muted" style="margin-top:6px;font-size:12.5px;">${summary ? escapeHtml(summary.reward_text) : "Vincula tu programa de fidelización"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Plan actual</span></div>
        <div class="kpi-value" style="font-size:20px;text-transform:capitalize;">${escapeHtml(merchant.plan)}</div>
      </div>
    </div>

    <div class="row-2">
      <div class="card">
        <div class="card-head">
          <div><h3>Clientes recientes</h3><div class="sub">Programa de fidelización</div></div>
          <a class="btn ghost" href="/panel/fidelizacion">Ver todos</a>
        </div>
        <div class="table-scroll">
        <table>
          <thead><tr><th>Cliente</th><th>Sellos</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2" class="muted">Todavía no tienes clientes inscritos.</td></tr>'}</tbody>
        </table>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Accesos rápidos</h3></div></div>
        <a class="btn" style="display:block;text-align:center;margin-bottom:10px;" href="/panel/fidelizacion">Escanear cliente</a>
        <a class="btn ghost" style="display:block;text-align:center;margin-bottom:10px;" href="/panel/mi-pagina">Editar mi página</a>
        <a class="btn ghost" style="display:block;text-align:center;" href="/panel/configuracion">Configuración</a>
      </div>
    </div>`;

  return new Response(renderShell({ title: "Resumen", active: "resumen", merchant, bodyHtml: body }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
