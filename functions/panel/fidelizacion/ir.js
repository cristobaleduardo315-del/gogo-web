import { requireMerchant } from "../../lib/auth.js";
import { getLealtadSsoUrl } from "../../lib/internalApi.js";

// Handoff de sesión: manda al dueño directo al panel real de gogo-lealtad
// (escaneo, config completa) sin pedirle login de nuevo. La cuenta de
// fidelización se autentica del lado de gogo-lealtad vía un token de un
// solo uso emitido con el secreto interno.
export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  if (!merchant.lealtad_merchant_id) {
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion" } });
  }
  const ssoUrl = await getLealtadSsoUrl(env, merchant.lealtad_merchant_id);
  if (!ssoUrl) {
    return new Response("No pudimos abrir tu programa de fidelización ahora mismo.", { status: 502 });
  }
  return new Response(null, { status: 302, headers: { Location: ssoUrl } });
}
