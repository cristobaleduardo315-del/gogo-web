// Página pública del menú digital (sin autenticación). Lee siempre datos
// en vivo de D1: cualquier cambio guardado en /panel/menu se refleja acá de
// inmediato, sin caché ni redeploy. El diseño es independiente del shell del
// dashboard (renderShell) porque esto es la cara pública del NEGOCIO, no de
// GoGo — el color de acento sale de lo que el dueño eligió en su panel.
import { escapeHtml } from "../lib/layout.js";
import { loadPublicMenu, formatCOP } from "../lib/menuData.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function notFoundPage() {
  return html(
    `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menú no encontrado — GoGo</title>
    <style>body{font-family:-apple-system,sans-serif;background:#f4f4f2;color:#0b0b0b;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;}
    div{max-width:360px;}h1{font-size:22px;margin-bottom:8px;}p{color:#6b6b6b;font-size:14px;}</style></head>
    <body><div><h1>No encontramos este menú</h1><p>Puede que el enlace esté mal escrito o que el negocio todavía no haya publicado su menú.</p></div></body></html>`,
    404
  );
}

function waLink(phone, productName) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const text = productName ? `Hola, quiero pedir: ${productName}` : "Hola, quiero hacer un pedido";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

// Deriva un color de texto legible (blanco o casi-negro) según qué tan clara
// sea theme_color, para que el header se vea bien sin importar qué color
// haya elegido el negocio.
function readableTextOn(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return "#ffffff";
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#141414" : "#ffffff";
}

function pageHtml({ page, merchant, bizPage, categories, host }) {
  const theme = page.theme_color || "#3d47a0";
  const onTheme = readableTextOn(theme);
  const orderLink = waLink(page.whatsapp_phone);
  const hasItems = categories.some((c) => c.products.length);

  const navPills = categories
    .filter((c) => c.products.length)
    .map((c) => `<a href="#cat-${c.id}" class="pill">${escapeHtml(c.name)}</a>`)
    .join("");

  const sections = categories
    .filter((c) => c.products.length)
    .map(
      (cat) => `
      <section class="cat" id="cat-${cat.id}">
        <h2>${escapeHtml(cat.name)}</h2>
        <div class="grid">
          ${cat.products
            .map((p) => {
              const itemLink = waLink(page.whatsapp_phone, p.name);
              return `
              <article class="item">
                ${
                  p.image_url
                    ? `<img class="thumb" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`
                    : `<div class="thumb placeholder">${escapeHtml(initials(p.name))}</div>`
                }
                <div class="item-body">
                  <div class="item-top">
                    <h3>${escapeHtml(p.name)}</h3>
                    <span class="price">${formatCOP(p.price)}</span>
                  </div>
                  ${p.description ? `<p class="desc">${escapeHtml(p.description)}</p>` : ""}
                  ${itemLink ? `<a class="order-link" href="${itemLink}" target="_blank" rel="noopener">Pedir por WhatsApp</a>` : ""}
                </div>
              </article>`;
            })
            .join("")}
        </div>
      </section>`
    )
    .join("");

  const contactBits = [];
  if (bizPage && bizPage.address) contactBits.push(`<div>📍 ${escapeHtml(bizPage.address)}</div>`);
  if (bizPage && bizPage.phone) contactBits.push(`<div>📞 ${escapeHtml(bizPage.phone)}</div>`);
  if (bizPage && bizPage.hours_json) contactBits.push(`<div>🕒 ${escapeHtml(bizPage.hours_json)}</div>`);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(merchant.business_name)} — Menú</title>
<meta name="description" content="Menú digital de ${escapeHtml(merchant.business_name)}">
<style>
  :root{ --theme:${theme}; --on-theme:${onTheme}; }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#faf7f0;color:#161616;}
  header{background:var(--theme);color:var(--on-theme);padding:36px 20px 28px;text-align:center;}
  header h1{font-size:26px;font-weight:800;letter-spacing:-0.3px;}
  header p{margin-top:6px;font-size:14px;opacity:0.88;}
  .order-cta{display:inline-block;margin-top:16px;background:var(--on-theme);color:var(--theme);font-weight:800;font-size:13.5px;padding:11px 20px;border-radius:24px;text-decoration:none;}
  nav.pills{position:sticky;top:0;z-index:10;background:#faf7f0;display:flex;gap:8px;overflow-x:auto;padding:14px 16px;border-bottom:1px solid #eee1c9;-webkit-overflow-scrolling:touch;}
  nav.pills::-webkit-scrollbar{display:none;}
  nav.pills .pill{flex-shrink:0;background:#fff;border:1px solid #eee1c9;color:#3a3a3a;font-size:13px;font-weight:700;padding:8px 16px;border-radius:20px;text-decoration:none;white-space:nowrap;}
  main{max-width:760px;margin:0 auto;padding:8px 20px 40px;}
  .cat{padding-top:26px;}
  .cat h2{font-size:19px;font-weight:800;margin-bottom:14px;color:var(--theme);}
  .grid{display:grid;gap:14px;}
  .item{display:flex;gap:14px;background:#fff;border:1px solid #eee1c9;border-radius:16px;padding:12px;}
  .thumb{width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0;background:#f0ead9;}
  .thumb.placeholder{display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--theme);background:#f0ead9;background:color-mix(in srgb, var(--theme) 14%, white);}
  .item-body{flex:1;min-width:0;}
  .item-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
  .item-top h3{font-size:15px;font-weight:700;}
  .price{font-size:14px;font-weight:800;color:var(--theme);white-space:nowrap;}
  .desc{margin-top:4px;font-size:12.5px;color:#71695a;line-height:1.4;}
  .order-link{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:var(--theme);text-decoration:none;}
  .empty{padding:60px 20px;text-align:center;color:#8a8272;}
  footer{max-width:760px;margin:20px auto 0;padding:20px;text-align:center;color:#8a8272;font-size:12.5px;line-height:1.8;}
  footer .credit{margin-top:18px;font-size:11px;}
  footer .credit a{color:#8a8272;}
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(merchant.business_name)}</h1>
    ${page.tagline ? `<p>${escapeHtml(page.tagline)}</p>` : ""}
    ${orderLink ? `<a class="order-cta" href="${orderLink}" target="_blank" rel="noopener">Pide por WhatsApp</a>` : ""}
  </header>
  ${navPills ? `<nav class="pills">${navPills}</nav>` : ""}
  <main>
    ${hasItems ? sections : `<div class="empty">Este negocio todavía está armando su menú. Vuelve pronto.</div>`}
  </main>
  <footer>
    ${contactBits.join("")}
    <div class="credit">Menú digital hecho con <a href="https://soygogo.com" target="_blank" rel="noopener">GoGo</a></div>
  </footer>
</body>
</html>`;
}

export async function onRequestGet({ request, env, params }) {
  const data = await loadPublicMenu(env.DB, String(params.slug || "").toLowerCase());
  if (!data) return notFoundPage();
  const host = new URL(request.url).host;
  return html(pageHtml({ ...data, host }));
}
