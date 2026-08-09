// Portada pública del negocio (sin autenticación) — la página donde
// "aterriza" el cliente final, igual que la home de Shopify: logo, nombre,
// botón para pasar a la carta y accesos directos (WhatsApp, cómo llegar).
// La carta completa (categorías y productos) vive en /menu/:slug/carta —
// dos páginas separadas, igual que en el sitio original.
import { escapeHtml } from "../lib/layout.js";
import { loadPublicMenu } from "../lib/menuData.js";
import { waLink, mapsLink, ICONS, FONT_LINKS, themeVars, rootCss, BASE_CSS, notFoundPage } from "../lib/menuTheme.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function pageHtml({ page, merchant, bizPage }) {
  const v = themeVars(page);
  const orderLink = waLink(page.whatsapp_phone);
  const dirLink = mapsLink(bizPage && bizPage.address);
  const cartaUrl = `/menu/${page.slug}/carta`;

  const infoLines = [];
  if (bizPage && bizPage.hours_json) infoLines.push({ icon: "clock", text: bizPage.hours_json });
  if (bizPage && bizPage.address) infoLines.push({ icon: "pin", text: bizPage.address });
  if (bizPage && bizPage.phone) infoLines.push({ icon: "phone", text: bizPage.phone });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(merchant.business_name)}</title>
<meta name="description" content="${escapeHtml(merchant.business_name)} — pide por WhatsApp o mira el menú completo.">
${FONT_LINKS}
<style>
  :root{ ${rootCss(v)} }
  ${BASE_CSS}
  body{background:var(--theme);}
  .hero{min-height:100vh;display:flex;align-items:center;padding:48px 20px;}
  .hero-inner{max-width:520px;margin:0 auto;text-align:center;color:var(--on-theme);}
  .hero-logo{width:min(260px,72%);height:auto;margin:0 auto 16px;display:block;}
  .hero-name{font-size:clamp(26px,7vw,34px);font-weight:800;letter-spacing:-0.01em;}
  .hero-tag{margin-top:8px;font-size:13px;font-weight:600;letter-spacing:0.06em;opacity:0.88;}
  .cta-list{display:flex;flex-direction:column;gap:12px;margin:30px 0 26px;}
  .info{display:flex;flex-direction:column;gap:8px;padding-top:22px;border-top:1px solid color-mix(in srgb, var(--on-theme) 30%, transparent);}
  .info-line{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:600;opacity:0.92;line-height:1.5;color:var(--on-theme);}
  footer{color:color-mix(in srgb, var(--on-theme) 70%, transparent);}
  footer a{color:inherit;}
</style>
</head>
<body>
  <div class="hero">
    <div class="hero-inner">
      ${
        page.logo_url
          ? `<img class="hero-logo" src="${escapeHtml(page.logo_url)}" alt="${escapeHtml(merchant.business_name)}">`
          : `<div class="hero-name">${escapeHtml(merchant.business_name)}</div>`
      }
      ${page.tagline ? `<div class="hero-tag">${escapeHtml(page.tagline)}</div>` : ""}
      <div class="cta-list">
        <a class="cta cta-main" href="${escapeHtml(cartaUrl)}">${ICONS.list}Ver menú</a>
        ${orderLink ? `<a class="cta cta-main" href="${orderLink}" target="_blank" rel="noopener">${ICONS.chat}Pide por WhatsApp</a>` : ""}
        ${dirLink ? `<a class="cta cta-alt" href="${dirLink}" target="_blank" rel="noopener">${ICONS.pin}Cómo llegar</a>` : ""}
      </div>
      ${
        infoLines.length
          ? `<div class="info">${infoLines
              .map((l) => `<div class="info-line">${ICONS[l.icon]}<span>${escapeHtml(l.text)}</span></div>`)
              .join("")}</div>`
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
