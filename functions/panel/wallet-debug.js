// Herramienta temporal de diagnóstico: expone en crudo el JSON que devuelve
// gogo-lealtad's /wallet-debug para el negocio logueado. Solo para investigar
// un problema puntual reportado por el usuario; se quita apenas se resuelva.
import { requireMerchant } from "../lib/auth.js";
import { getWalletDebug } from "../lib/internalApi.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const merchant = await requireMerchant(request, env);
  if (!merchant) {
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || undefined;
  const resync = url.searchParams.get("resync") === "1";
  const classResync = url.searchParams.get("classResync") === "1";
  const result = await getWalletDebug(env, merchant.lealtad_merchant_id, { code, resync, classResync });
  return new Response(JSON.stringify(result, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
