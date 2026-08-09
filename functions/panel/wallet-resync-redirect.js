// TEMPORAL: puente de un solo uso para entrar como el negocio ya logueado
// (cookie de gogo-web) directo al panel real de gogo-lealtad vía SSO, sin
// conocer su contraseña (nunca existe una que el dueño use directamente).
// Necesario para correr /panel/wallet-resync-temp del lado correcto —
// gogo-lealtad no tiene ninguna sesión de merchant abierta en el navegador
// del operador salvo que se entre por acá. Quitar junto con la ruta de
// resync una vez usado.
import { requireMerchant } from "../lib/auth.js";
import { getLealtadSsoUrl } from "../lib/internalApi.js";

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  if (!merchant.lealtad_merchant_id) {
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion" } });
  }
  const url = await getLealtadSsoUrl(env, merchant.lealtad_merchant_id);
  if (!url) return new Response("No se pudo generar el enlace SSO.", { status: 502 });
  return new Response(null, { status: 302, headers: { Location: url } });
}
