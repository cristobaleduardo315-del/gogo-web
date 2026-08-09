// Portada pública del negocio (sin autenticación) — la página donde
// "aterriza" el cliente final. Port fiel de la portada que ya existía en
// Shopify (theme_export de West Burger): mismo fondo animado, mismos
// botones, misma tipografía. La carta completa (categorías y productos)
// vive en /menu/:slug/carta — dos páginas separadas, igual que en el sitio
// original.
import { escapeHtml } from "../lib/layout.js";
import { loadPublicMenu } from "../lib/menuData.js";
import { waLink, mapsLink, FONT_LINKS, themeVars, rootCss, notFoundPage } from "../lib/menuTheme.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Íconos calcados del diseño original de Shopify (rellenos, para los
// botones de la portada).
const ICON_LIST = `<svg viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>`;
const ICON_WHATSAPP = `<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`;
const ICON_INSTAGRAM = `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`;
const ICON_TIKTOK = `<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>`;
const ICON_PIN_FILLED = `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>`;

// Íconos de la lista de info (trazo, no relleno) — calcados 1:1 del bloque
// original: tipo de negocio (tienda), horario (reloj), frase (check), año
// de fundación (estrella) y ubicación (pin).
const ICON_STORE = `<svg class="wb-info-ic" viewBox="0 0 24 24"><path d="M3 11a9 6 0 0 1 18 0z"/><path d="M3 13h18"/><path d="M4 17h16v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>`;
const ICON_CLOCK = `<svg class="wb-info-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const ICON_CHECK = `<svg class="wb-info-ic" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>`;
const ICON_STAR_STROKE = `<svg class="wb-info-ic" viewBox="0 0 24 24"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>`;
const ICON_PIN_STROKE = `<svg class="wb-info-ic" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;

function pageHtml({ page, merchant, bizPage }) {
  const v = themeVars(page);
  const orderLink = waLink(page.whatsapp_phone);
  const dirLink = mapsLink(bizPage && bizPage.address);
  const cartaUrl = `/menu/${page.slug}/carta`;

  // Las 3 primeras (tipo de negocio, frase, año) las configura GoGo; horario
  // y ubicación salen de "Mi página" (business_page), que el negocio ya
  // administra desde su panel.
  const infoLines = [];
  if (page.info_title) infoLines.push({ icon: ICON_STORE, text: page.info_title, title: true });
  if (bizPage && bizPage.hours_json) infoLines.push({ icon: ICON_CLOCK, text: bizPage.hours_json });
  if (page.slogan_line) infoLines.push({ icon: ICON_CHECK, text: page.slogan_line });
  if (page.founded_year) infoLines.push({ icon: ICON_STAR_STROKE, text: `Estd. ${page.founded_year}` });
  if (bizPage && bizPage.address) infoLines.push({ icon: ICON_PIN_STROKE, text: bizPage.address });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(merchant.business_name)}</title>
<meta name="description" content="${escapeHtml(merchant.business_name)} — pide por WhatsApp o mira el menú completo.">
${FONT_LINKS}
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{ ${rootCss(v)} }
  .wb-hero{background:var(--theme);padding:0 0 56px;font-family:'Sora',sans-serif;position:relative;overflow:hidden;min-height:100vh;}
  .wb-bg-head{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:0;pointer-events:none;}
  .wb-bg-head img{position:absolute;opacity:1;width:150px;height:auto;}
  .wb-bg-head .h1{top:4%;left:2%;animation:floatA 10s ease-in-out infinite;}
  .wb-bg-head .h2{bottom:6%;right:3%;width:175px;animation:floatB 12s ease-in-out infinite;}
  .wb-bg-head .h3{top:8%;right:4%;width:125px;animation:spin 45s linear infinite;}
  .wb-bg-head .h4{bottom:10%;left:4%;width:105px;animation:spin 60s linear infinite reverse;}
  @keyframes floatA{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(-22px) rotate(5deg);}}
  @keyframes floatB{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(18px) rotate(-5deg);}}
  @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  .wb-hero-inner{position:relative;z-index:1;max-width:520px;margin:0 auto;padding:44px 20px 0;text-align:center;}
  .wb-hero-logo{width:min(280px,72%);height:auto;margin:0 auto 6px;display:block;}
  .wb-hero-name{font-size:clamp(22px,7vw,30px);font-weight:700;color:var(--cream);margin:0 0 6px;}
  .wb-hero-tag{font-size:clamp(11px,3vw,13px);font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--cream);margin:0 0 30px;}
  .wb-cta-list{display:flex;flex-direction:column;gap:12px;margin-bottom:34px;}
  .wb-cta{display:flex;align-items:center;justify-content:center;gap:10px;font-family:'Sora',sans-serif;font-size:clamp(13px,3.6vw,15px);font-weight:700;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;padding:17px 20px;border-radius:50px;transition:transform 0.2s,background 0.2s,color 0.2s;box-sizing:border-box;}
  .wb-cta svg{width:19px;height:19px;flex-shrink:0;}
  .wb-cta-main{background:var(--cream);color:var(--theme);}
  .wb-cta-main svg{fill:var(--theme);}
  .wb-cta-main:hover{background:#ffffff;transform:translateY(-3px);}
  .wb-cta-alt{background:transparent;color:var(--cream);border:2px solid var(--cream);}
  .wb-cta-alt svg{fill:var(--cream);}
  .wb-cta-alt:hover{background:var(--cream);color:var(--theme);transform:translateY(-3px);}
  .wb-cta-alt:hover svg{fill:var(--theme);}
  .wb-info{display:flex;flex-direction:column;gap:9px;padding-top:26px;border-top:1px solid rgba(245,230,200,0.3);}
  .wb-info p{font-family:'Sora',sans-serif;font-size:clamp(12px,3.2vw,14px);font-weight:700;color:var(--cream);letter-spacing:0.04em;margin:0;line-height:1.6;display:flex;align-items:center;justify-content:center;gap:8px;}
  .wb-info-title{font-size:clamp(13px,3.8vw,16px)!important;color:#ffffff!important;letter-spacing:0.1em!important;text-transform:uppercase;}
  .wb-info-title .wb-info-ic{stroke:#ffffff;}
  .wb-info-ic{width:17px;height:17px;flex-shrink:0;fill:none;stroke:var(--cream);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
  footer{max-width:520px;margin:20px auto 0;padding:0 20px;text-align:center;color:rgba(245,230,200,0.6);font-size:12px;position:relative;z-index:1;}
  footer a{color:inherit;}
  @media (max-width:640px){
    .wb-bg-head img{width:88px;}
    .wb-bg-head .h2{width:105px;}
    .wb-bg-head .h3{width:78px;}
    .wb-bg-head .h4{width:68px;}
    .wb-hero-inner{padding:34px 18px 0;}
    .wb-hero{padding-bottom:40px;}
  }
</style>
</head>
<body>
  <div class="wb-hero">
    <div class="wb-bg-head">
      <img class="h1" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-02.webp?v=1784579998" alt="">
      <img class="h2" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-02.webp?v=1784579998" alt="">
      <img class="h3" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-05.webp?v=1784579998" alt="">
      <img class="h4" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-05.webp?v=1784579998" alt="">
    </div>
    <div class="wb-hero-inner">
      ${
        page.logo_url
          ? `<img class="wb-hero-logo" src="${escapeHtml(page.logo_url)}" alt="${escapeHtml(merchant.business_name)}">`
          : `<div class="wb-hero-name">${escapeHtml(merchant.business_name)}</div>`
      }
      ${page.tagline ? `<p class="wb-hero-tag">${escapeHtml(page.tagline)}</p>` : ""}

      <div class="wb-cta-list">
        <a class="wb-cta wb-cta-main" href="${escapeHtml(cartaUrl)}">${ICON_LIST}Ver menú</a>
        ${orderLink ? `<a class="wb-cta wb-cta-main" href="${orderLink}" target="_blank" rel="noopener">${ICON_WHATSAPP}Pide tu domicilio</a>` : ""}
        ${page.instagram_url ? `<a class="wb-cta wb-cta-alt" href="${escapeHtml(page.instagram_url)}" target="_blank" rel="noopener">${ICON_INSTAGRAM}Instagram</a>` : ""}
        ${page.tiktok_url ? `<a class="wb-cta wb-cta-alt" href="${escapeHtml(page.tiktok_url)}" target="_blank" rel="noopener">${ICON_TIKTOK}TikTok</a>` : ""}
        ${dirLink ? `<a class="wb-cta wb-cta-alt" href="${dirLink}" target="_blank" rel="noopener">${ICON_PIN_FILLED}Cómo llegar</a>` : ""}
      </div>

      ${
        infoLines.length
          ? `<div class="wb-info">${infoLines.map((l) => `<p${l.title ? ' class="wb-info-title"' : ""}>${l.icon}<span>${escapeHtml(l.text)}</span></p>`).join("")}</div>`
          : ""
      }
    </div>
  </div>
  <footer>Menú digital hecho con <a href="https://soygogo.com" target="_blank" rel="noopener">GoGo</a></footer>
</body>
</html>`;
}

export async function onRequestGet({ params, env }) {
  const data = await loadPublicMenu(env.DB, String(params.slug || "").toLowerCase());
  if (!data) return notFoundPage(html);
  return html(pageHtml(data));
}
