// Diagnóstico temporal para depurar "No se puede cargar este pase" en
// Google Wallet. Muestra el JSON crudo que gogo-lealtad ve al consultar la
// loyaltyClass del negocio en la API de Google Wallet. Solo accesible con
// sesión de comercio (mismo requireMerchant que el resto del /panel).
// Quitar esta ruta (y getWalletDebug en lib/internalApi.js, y el endpoint
// /internal/api/merchants/:id/wallet-debug + debugLoyaltyClass en
// gogo-lealtad) una vez resuelto el problema.
import { requireMerchant } from "../lib/auth.js";
import { getWalletDebug } from "../lib/internalApi.js";

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  if (!merchant.lealtad_merchant_id) {
    return new Response(JSON.stringify({ error: "Este negocio no tiene cuenta de fidelización vinculada." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const fix = new URL(request.url).searchParams.get("fix") === "1";
  const result = await getWalletDebug(env, merchant.lealtad_merchant_id, { fix });
  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
