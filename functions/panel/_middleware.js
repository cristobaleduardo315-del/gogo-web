// Antes protegía /panel/* con un usuario/contraseña único compartido
// (GOGO_USER/GOGO_PASS). Ahora que cada negocio tiene su propia cuenta real
// en web_merchants, la protección es la sesión de login normal: sin sesión
// válida, se manda a /login. Las rutas de panel/*.js igual repiten el
// chequeo por si acaso, pero este middleware evita renderizar nada si no
// hay sesión.

import { requireMerchant } from "../lib/auth.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const merchant = await requireMerchant(request, env);
  if (!merchant) {
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return next();
}
