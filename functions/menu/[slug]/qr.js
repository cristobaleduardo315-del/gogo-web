// Ruta que codifica el QR que se muestra en /panel/menu: suma 1 al contador
// de escaneos y redirige al menú público real. Separarla del enlace directo
// permite distinguir "alguien escaneó el QR" de cualquier otra forma de
// llegar al menú (compartir el link, buscarlo, etc.) sin tocar la página
// pública en sí.
//
// El QR siempre se genera con este host (soygogo.com, ver panel/menu.js —
// es el único host donde vive el panel), pero el destino final SÍ respeta
// el dominio propio del negocio si tiene uno configurado (menu_pages.
// custom_domain, ver migrations/0006): ahí es donde su cliente final debe
// aterrizar, no en soygogo.com. El middleware raíz (functions/_middleware.js)
// ya sirve la portada del negocio en la raíz "/" de ese dominio, así que
// basta con mandarlo ahí.
import { getMenuPageBySlug, incrementQrScan, logQrScan } from "../../lib/menuData.js";

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || "").toLowerCase();
  const page = await getMenuPageBySlug(env.DB, slug);
  if (!page) {
    return new Response(null, { status: 302, headers: { Location: "/menu/" + encodeURIComponent(slug) } });
  }
  await incrementQrScan(env.DB, slug);
  // El log con fecha (para la gráfica del dashboard) no debe tumbar el
  // redirect si la migración 0008 todavía no corrió en producción.
  try {
    await logQrScan(env.DB, page.merchant_id, Date.now());
  } catch (err) {
    console.error("logQrScan (menu):", err.message || err);
  }
  const destination = page.custom_domain ? `https://${page.custom_domain}/` : "/menu/" + encodeURIComponent(slug);
  return new Response(null, { status: 302, headers: { Location: destination } });
}
