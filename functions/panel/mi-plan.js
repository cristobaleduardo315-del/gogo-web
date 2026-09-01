import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
 
const PLANS = [
  { key: "start", name: "GoGo Start", price: "69.900" },
  { key: "plus", name: "GoGo Growth", price: "129.900" },
  { key: "pro", name: "GoGo Pro", price: "249.900" },
];
 
function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
 
function pageBody(merchant, { notice, pendingPlan } = {}) {
  const cards = PLANS.map((p) => {
    const isCurrent = p.key === merchant.plan;
    return `<div class="card${isCurrent ? " plan-card" : ""}" style="flex:1;">
      <div class="plan-name">${escapeHtml(p.name)}</div>
      <div class="plan-price">$${p.price} / mes</div>
      ${
        isCurrent
          ? `<div class="plan-row"><span class="k">Estado</span><span class="v" style="color:var(--lime-text);">Plan actual</span></div>`
          : `<form method="POST" action="/panel/mi-plan">
               <input type="hidden" name="plan" value="${p.key}">
               <button class="plan-cta ghost" type="submit">Solicitar cambio a ${escapeHtml(p.name)}</button>
             </form>`
      }
    </div>`;
  }).join("");
 
  return `
    <div class="topbar"><div><h1>Mi plan</h1><p>Tu plan actual y opciones para cambiarlo.</p></div></div>
    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
    ${
      pendingPlan
        ? `<div class="notice">Tienes una solicitud de cambio a <strong>${escapeHtml(pendingPlan)}</strong> pendiente de confirmación. Te contactaremos para completar el pago.</div>`
        : ""
    }
    <div style="display:flex;gap:16px;flex-wrap:wrap;">${cards}</div>`;
}
 
export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  const pending = await env.DB.prepare(
    "SELECT requested_plan FROM plan_change_requests WHERE merchant_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
  )
    .bind(merchant.id)
    .first();
  return html(
    renderShell({
      title: "Mi plan",
      active: "mi-plan",
      merchant,
      bodyHtml: pageBody(merchant, { pendingPlan: pending?.requested_plan }),
    })
  );
}
 
export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  const formData = await request.formData();
  const plan = String(formData.get("plan") || "");
  if (!PLANS.some((p) => p.key === plan)) {
    return html(renderShell({ title: "Mi plan", active: "mi-plan", merchant, bodyHtml: pageBody(merchant, {}) }), 400);
  }
  // Nunca se cobra ni se activa el plan automáticamente: solo queda
  // registrada la solicitud para seguimiento manual (igual que la regla ya
  // establecida para pagos con Wompi).
  await env.DB.prepare(
    `INSERT INTO plan_change_requests (id, merchant_id, requested_plan, status, created_at) VALUES (?, ?, ?, 'pending', ?)`
  )
    .bind(crypto.randomUUID(), merchant.id, plan, Date.now())
    .run();
  return html(
    renderShell({
      title: "Mi plan",
      active: "mi-plan",
      merchant,
      bodyHtml: pageBody(merchant, {
        notice: "Tu solicitud fue registrada. Te contactaremos para completar el pago y activar el cambio.",
        pendingPlan: plan,
      }),
    })
  );
}
