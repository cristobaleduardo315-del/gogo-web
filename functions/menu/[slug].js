// Página pública del menú digital (sin autenticación). Lee siempre datos
// en vivo de D1: cualquier cambio guardado en /panel/menu se refleja acá de
// inmediato, sin caché ni redeploy.
//
// El lenguaje visual (tipografía Sora, paleta crema + color de marca,
// tarjetas de producto, badges de categoría, nav inferior fija) está
// inspirado en el diseño que el negocio ya tenía en Shopify — se migró acá
// como plantilla reutilizable: el color de marca, el logo, el nombre y el
// contenido salen de lo que el dueño configura en su panel, no están fijos
// a un negocio en particular.
import { escapeHtml } from "../lib/layout.js";
import { loadPublicMenu, formatCOP } from "../lib/menuData.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function clamp255(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return { r: 61, g: 78, b: 172 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((n) => clamp255(n).toString(16).padStart(2, "0")).join("");
}

// Sombrea un color de marca hacia un tono más oscuro (para el área de foto
// de cada producto y los estados hover), sin importar qué color haya
// elegido el negocio.
function shade(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

// Texto crema por defecto (así se ve el diseño original), salvo que el
// color de marca sea tan claro que el crema se pierda — ahí se usa tinta
// oscura para mantener el contraste.
function textOnTheme(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.78 ? "#2c2a22" : "#f5e6c8";
}

function notFoundPage() {
  return html(
    `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menú no encontrado — GoGo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:"Sora",sans-serif;background:#3d4eac;color:#f5e6c8;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;}
      div{max-width:360px;}h1{font-size:22px;margin-bottom:10px;font-weight:800;}p{opacity:0.85;font-size:14px;line-height:1.5;}
    </style></head>
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

function mapsLink(address) {
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function pageHtml({ page, merchant, bizPage, categories }) {
  const theme = page.theme_color || "#3d47a0";
  const cream = "#f5e6c8";
  const onTheme = textOnTheme(theme);
  const themeDark = shade(theme, 0.78);
  const themeDarker = shade(theme, 0.68);

  const orderLink = waLink(page.whatsapp_phone);
  const dirLink = mapsLink(bizPage && bizPage.address);
  const hasItems = categories.some((c) => c.products.length);
  const visibleCats = categories.filter((c) => c.products.length);

  const navPills = visibleCats
    .map((c) => `<a href="#cat-${c.id}">${escapeHtml(c.name)}</a>`)
    .join("");

  const infoLines = [];
  if (bizPage && bizPage.hours_json) infoLines.push({ icon: "clock", text: bizPage.hours_json });
  if (bizPage && bizPage.address) infoLines.push({ icon: "pin", text: bizPage.address });
  if (bizPage && bizPage.phone) infoLines.push({ icon: "phone", text: bizPage.phone });

  const iconSvg = {
    clock: `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
    pin: `<svg viewBox="0 0 24 24" class="ic"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" class="ic"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.5 2.1L7.9 9.7a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" class="ic"><path d="M21 11.5a8.4 8.4 0 01-4.5 7.4 8.4 8.4 0 01-7.9 0L3 21l1.9-5.6a8.4 8.4 0 01-.9-3.9 8.4 8.4 0 014.5-7.4 8.4 8.4 0 017.9 0A8.4 8.4 0 0121 11.5z"/></svg>`,
  };

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --theme:${theme}; --theme-dark:${themeDark}; --theme-darker:${themeDarker};
    --cream:${cream}; --on-theme:${onTheme};
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:"Sora",sans-serif;background:var(--cream);color:#2c2a22;}
  .ic{width:17px;height:17px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}

  /* ---- Hero ---- */
  header{background:var(--theme);color:var(--on-theme);padding:48px 20px 40px;}
  .hero-inner{max-width:520px;margin:0 auto;text-align:center;}
  .hero-logo{width:min(220px,70%);height:auto;margin:0 auto 14px;display:block;}
  .hero-name{font-size:clamp(24px,7vw,32px);font-weight:800;letter-spacing:-0.01em;}
  .hero-tag{margin-top:8px;font-size:13px;font-weight:600;letter-spacing:0.06em;opacity:0.88;}
  .cta-list{display:flex;flex-direction:column;gap:12px;margin:30px 0 26px;}
  .cta{display:flex;align-items:center;justify-content:center;gap:9px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:16px 20px;border-radius:50px;transition:transform .2s,background .2s,color .2s;}
  .cta svg{width:18px;height:18px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
  .cta-main{background:var(--cream);color:var(--theme);}
  .cta-main:hover{transform:translateY(-2px);}
  .cta-alt{background:transparent;color:var(--on-theme);border:2px solid var(--on-theme);}
  .cta-alt:hover{background:var(--on-theme);color:var(--theme);transform:translateY(-2px);}
  .info{display:flex;flex-direction:column;gap:8px;padding-top:22px;border-top:1px solid color-mix(in srgb, var(--on-theme) 30%, transparent);}
  .info-line{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:600;opacity:0.92;line-height:1.5;}

  /* ---- Menú ---- */
  main{max-width:900px;margin:0 auto;padding:40px 20px 90px;}
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

  /* ---- Nav inferior fija ---- */
  nav.bottom{position:fixed;left:0;bottom:0;width:100%;z-index:20;background:var(--theme);padding:10px 0;box-shadow:0 -3px 14px rgba(0,0,0,.2);}
  nav.bottom .scroll{display:flex;gap:8px;overflow-x:auto;padding:0 16px;max-width:940px;margin:0 auto;scrollbar-width:none;}
  nav.bottom .scroll::-webkit-scrollbar{display:none;}
  nav.bottom a{flex-shrink:0;font-size:11.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--theme);background:var(--cream);padding:9px 16px;border-radius:40px;text-decoration:none;white-space:nowrap;}

  footer{max-width:900px;margin:16px auto 100px;padding:0 20px;text-align:center;color:#8a8272;font-size:12px;}
  footer a{color:#8a8272;}
</style>
</head>
<body>
  <header>
    <div class="hero-inner">
      ${
        page.logo_url
          ? `<img class="hero-logo" src="${escapeHtml(page.logo_url)}" alt="${escapeHtml(merchant.business_name)}">`
          : `<div class="hero-name">${escapeHtml(merchant.business_name)}</div>`
      }
      ${page.tagline ? `<div class="hero-tag">${escapeHtml(page.tagline)}</div>` : ""}
      ${
        orderLink || dirLink
          ? `<div class="cta-list">
              ${orderLink ? `<a class="cta cta-main" href="${orderLink}" target="_blank" rel="noopener">${iconSvg.chat}Pide por WhatsApp</a>` : ""}
              ${dirLink ? `<a class="cta cta-alt" href="${dirLink}" target="_blank" rel="noopener">${iconSvg.pin}Cómo llegar</a>` : ""}
            </div>`
          : ""
      }
      ${
        infoLines.length
          ? `<div class="info">${infoLines
              .map((l) => `<div class="info-line">${iconSvg[l.icon]}<span>${escapeHtml(l.text)}</span></div>`)
              .join("")}</div>`
          : ""
      }
    </div>
  </header>

  <main>
    <div class="menu-head">
      <span class="eyebrow">Nuestro menú</span>
      <h1 class="menu-title">Menú</h1>
      <div class="divider"></div>
    </div>
    ${hasItems ? sections : `<div class="empty">Este negocio todavía está armando su menú. Vuelve pronto.</div>`}
  </main>

  ${
    visibleCats.length > 1
      ? `<nav class="bottom"><div class="scroll">${navPills}</div></nav>`
      : ""
  }

  <footer>
    Menú digital hecho con <a href="https://soygogo.com" target="_blank" rel="noopener">GoGo</a>
  </footer>
</body>
</html>`;
}

export async function onRequestGet({ params, env }) {
  const data = await loadPublicMenu(env.DB, String(params.slug || "").toLowerCase());
  if (!data) return notFoundPage();
  return html(pageHtml(data));
}
