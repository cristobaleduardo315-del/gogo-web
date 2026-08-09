// Ruta que codifica el QR que se muestra en /panel/menu: suma 1 al contador
// de escaneos y redirige al menú público real (/menu/:slug). Separarla del
// enlace directo permite distinguir "alguien escaneó el QR" de cualquier
// otra forma de llegar al menú (compartir el link, buscarlo, etc.) sin
// tocar la página pública en sí.
import { getMenuPageBySlug, incrementQrScan } from "../../lib/menuData.js";

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || "").toLowerCase();
  const page = await getMenuPageBySlug(env.DB, slug);
  if (!page) {
    return new Response(null, { status: 302, headers: { Location: "/menu/" + encodeURIComponent(slug) } });
  }
  await incrementQrScan(env.DB, slug);
  return new Response(null, { status: 302, headers: { Location: "/menu/" + encodeURIComponent(slug) } });
}
