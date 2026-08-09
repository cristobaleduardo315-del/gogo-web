// Carta pública: categorías y productos, con nav inferior fija para saltar
// entre categorías. Segunda página del sitio del negocio (la portada con
// logo y accesos directos vive en /menu/:slug). Sin autenticación, lee
// datos en vivo de D1: cualquier cambio guardado en /panel/menu se refleja
// acá al instante.
import { escapeHtml } from "../../lib/layout.js";
import { loadPublicMenu, formatCOP } from "../../lib/menuData.js";
import { waLink, initials, ICONS, FONT_LINKS, themeVars, rootCss, BASE_CSS, notFoundPage } from "../../lib/menuTheme.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function pageHtml({ page, merchant, categories }) {
  const v = themeVars(page);
  const hasItems = categories.some((c) => c.products.length);
  const visibleCats = categories.filter((c) => c.products.length);
  const homeUrl = `/menu/${page.slug}`;

  const navPills = visibleCats.map((c) => `<a href="#cat-${c.id}">${escapeHtml(c.name)}</a>`).join("");

  const sections = visibleCats
    .map(
      (cat) => `
      <section class="cat" id="cat-${cat.id}">
        <div class="cat-head"><span class="cat-badge">${escapeHtml(cat.name)}</span><span class="cat-line"></span></div>
        <div class="grid">
          ${cat.products
            .map((p) => {
              const itemLink = waLink(page.whatsapp_phone, p.name);
              return `
              <article class="item">
                ${
                  p.image_url
                    ? `<div class="item-img"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy"></div>`
                    : `<div class="item-img placeholder">${escapeHtml(initials(p.name))}</div>`
                }
                <div class="item-body">
                  <h3>${escapeHtml(p.name)}</h3>
                  ${p.description ? `<p class="desc">${escapeHtml(p.description)}</p>` : ""}
                  <div class="price">${formatCOP(p.price)}</div>
                  ${itemLink ? `<a class="order-link" href="${itemLink}" target="_blank" rel="noopener">Pedir por WhatsApp</a>` : ""}
                </div>
              </article>`;
            })
            .join("")}
        </div>
      </section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(merchant.business_name)} — Menú</title>
<meta name="description" content="Menú digital de ${escapeHtml(merchant.business_name)}">
${FONT_LINKS}
<style>
  :root{ ${rootCss(v)} }
  ${BASE_CSS}
  main{max-width:900px;margin:0 auto;padding:24px 20px 90px;}
  .back{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--theme);text-decoration:none;margin-bottom:22px;}
  .menu-head{text-align:center;margin-bottom:32px;}
  .eyebrow{display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--theme);border:1px solid color-mix(in srgb, var(--theme) 50%, transparent);padding:7px 18px;border-radius:40px;margin-bottom:14px;background:color-mix(in srgb, var(--cream) 85%, white);}
  .menu-title{font-size:clamp(30px,8vw,42px);font-weight:800;color:var(--theme);letter-spacing:-0.02em;margin-bottom:12px;}
  .divider{width:44px;height:2px;background:color-mix(in srgb, var(--theme) 60%, transparent);margin:0 auto;}
  .cat{margin-top:34px;}
  .cat-head{display:flex;align-items:center;gap:14px;margin-bottom:20px;}
  .cat-badge{font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:var(--cream);background:var(--theme);padding:8px 18px;border-radius:40px;white-space:nowrap;font-weight:700;}
  .cat-line{flex:1;height:1px;background:color-mix(in srgb, var(--theme) 35%, transparent);}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
  .item{background:var(--theme);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s;}
  .item:hover{transform:translateY(-3px);box-shadow:0 10px 26px color-mix(in srgb, var(--theme) 35%, transparent);}
  .item-img{width:100%;height:140px;background:var(--theme-dark);display:flex;align-items:center;justify-content:center;overflow:hidden;}
  .item-img img{width:100%;height:100%;object-fit:cover;}
  .item-img.placeholder{color:var(--cream);font-weight:800;font-size:26px;letter-spacing:0.02em;}
  .item-body{padding:14px 16px 16px;position:relative;flex:1;}
  .item-body::before{content:"";position:absolute;top:0;left:0;width:4px;height:100%;background:var(--cream);}
  .item-body h3{font-size:15.5px;font-weight:700;color:var(--on-theme);line-height:1.25;}
  .item-body .desc{margin-top:5px;font-size:12px;font-weight:600;color:var(--on-theme);opacity:0.78;line-height:1.4;}
  .item-body .price{margin-top:8px;font-size:15px;font-weight:800;color:var(--cream);}
  .order-link{display:inline-block;margin-top:8px;font-size:11.5px;font-weight:700;color:var(--cream);text-decoration:underline;}
  .empty{padding:60px 20px;text-align:center;color:#8a8272;}
  nav.bottom{position:fixed;left:0;bottom:0;width:100%;z-index:20;background:var(--theme);padding:10px 0;box-shadow:0 -3px 14px rgba(0,0,0,.2);}
  nav.bottom .scroll{display:flex;gap:8px;overflow-x:auto;padding:0 16px;max-width:940px;margin:0 auto;scrollbar-width:none;}
  nav.bottom .scroll::-webkit-scrollbar{display:none;}
  nav.bottom a{flex-shrink:0;font-size:11.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--theme);background:var(--cream);padding:9px 16px;border-radius:40px;text-decoration:none;white-space:nowrap;}
</style>
</head>
<body>
  <main>
    <a class="back" href="${escapeHtml(homeUrl)}">${ICONS.back}${escapeHtml(merchant.business_name)}</a>
    <div class="menu-head">
      <span class="eyebrow">Nuestro menú</span>
      <h1 class="menu-title">Menú</h1>
      <div class="divider"></div>
    </div>
    ${hasItems ? sections : `<div class="empty">Este negocio todavía está armando su menú. Vuelve pronto.</div>`}
  </main>

  ${visibleCats.length > 1 ? `<nav class="bottom"><div class="scroll">${navPills}</div></nav>` : ""}
</body>
</html>`;
}

export async function onRequestGet({ params, env }) {
  const data = await loadPublicMenu(env.DB, String(params.slug || "").toLowerCase());
  if (!data) return notFoundPage(html);
  return html(pageHtml(data));
}
