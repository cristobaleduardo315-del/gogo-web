// Enruta dominios propios de cada negocio (ej. www.westburger.com) hacia su
// menú público, sin que el negocio deje de administrarse desde el panel
// central de GoGo.
//
// Cómo se activa para un negocio (lo hace GoGo directamente, no es
// autoservicio desde el panel — mismo criterio que theme_color/logo_url):
//   1. Agregar el dominio como "Custom domain" de este proyecto en el
//      dashboard de Cloudflare Pages (Settings → Custom domains). Cloudflare
//      pide un registro DNS (CNAME hacia gogo-web.pages.dev, o CNAME
//      flattening si es dominio raíz) y emite el certificado SSL solo.
//   2. Guardar ese mismo dominio en menu_pages.custom_domain (columna
//      agregada en la migración 0006) para el negocio correspondiente.
//
// Con eso, cualquier request que llegue con ese Host se resuelve acá mismo:
// "/" se sirve como si fuera /menu/:slug y "/carta" como /menu/:slug/carta,
// usando exactamente el mismo HTML/CSS/JS — el negocio nunca nota la
// diferencia entre su dominio propio y soygogo.com/menu/:slug.
import { renderMenuHome } from "./lib/menuHomeRender.js";
import { renderMenuCarta } from "./lib/menuCartaRender.js";

// Hosts que SIEMPRE se sirven con el enrutamiento normal de este proyecto
// (marketing, panel, login, etc.) — nunca se tratan como dominio de negocio.
function isGogoHost(host) {
  return (
    host === "soygogo.com" ||
    host === "www.soygogo.com" ||
    host.endsWith(".pages.dev") ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  if (isGogoHost(host)) return next();

  const row = await env.DB.prepare("SELECT slug FROM menu_pages WHERE custom_domain = ?").bind(host).first();
  if (!row) return next();

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return renderMenuHome(env, row.slug);
  if (path === "/carta") return renderMenuCarta(env, row.slug);

  return next();
}
