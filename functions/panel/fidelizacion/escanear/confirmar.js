import { requireMerchant } from "../../../lib/auth.js";
import { stampLealtadCustomer } from "../../../lib/internalApi.js";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant || !merchant.lealtad_merchant_id) return json({ error: "No autorizado." }, 401);

  const body = await request.json().catch(() => ({}));
  if (!body.code) return json({ error: "Falta el código." }, 400);

  const { ok, status, data } = await stampLealtadCustomer(env, merchant.lealtad_merchant_id, {
    code: body.code,
    quantity: body.quantity,
    direction: "add",
    source: "scan",
  });
  if (!ok) return json({ error: data?.error || "No se pudo guardar." }, status || 502);
  return json(data);
}
