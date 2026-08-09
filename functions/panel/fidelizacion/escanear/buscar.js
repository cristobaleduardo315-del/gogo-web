import { requireMerchant } from "../../../lib/auth.js";
import { lookupLealtadCustomer } from "../../../lib/internalApi.js";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

// Puente entre la cámara (JS en el navegador, en el dominio de gogo-web) y
// la API interna de gogo-lealtad: la sesión del dueño del negocio se valida
// acá (cookie de gogo-web) y de acá para adelante se usa el secreto interno,
// que nunca llega al navegador.
export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant || !merchant.lealtad_merchant_id) return json({ error: "No autorizado." }, 401);

  const body = await request.json().catch(() => ({}));
  if (!body.code) return json({ error: "Falta el código." }, 400);

  const { ok, status, data } = await lookupLealtadCustomer(env, merchant.lealtad_merchant_id, body.code);
  if (!ok) return json({ error: data?.error || "No se pudo buscar el cliente." }, status || 502);
  return json(data);
}
