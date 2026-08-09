// Piezas visuales compartidas entre las dos páginas públicas del menú
// (la portada en [slug].js y la carta en [slug]/carta.js): mismo lenguaje
// visual (Sora, paleta crema + color de marca, iconos) para que ambas se
// vean como una sola experiencia aunque sean rutas distintas — igual que en
// el sitio de Shopify original, donde la portada y la carta también eran
// dos páginas separadas.
//
// El color/logo de marca hoy salen de menu_pages (theme_color/logo_url),
// pero el dueño del negocio YA NO los edita desde su panel: eso lo
// configuramos nosotros al montar cada negocio. Dejar esto data-driven (en
// vez de fijo en el código) es lo que permitirá, en un desarrollo aparte,
// ofrecer diseños distintos por negocio sin tocar estas plantillas.

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

export function shade(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function textOnTheme(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.78 ? "#2c2a22" : "#f5e6c8";
}

export function waLink(phone, productName) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const text = productName ? `Hola, quiero pedir: ${productName}` : "Hola, quiero hacer un pedido";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function mapsLink(address) {
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export const ICONS = {
  clock: `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" class="ic"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" class="ic"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.5 2.1L7.9 9.7a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" class="ic"><path d="M21 11.5a8.4 8.4 0 01-4.5 7.4 8.4 8.4 0 01-7.9 0L3 21l1.9-5.6a8.4 8.4 0 01-.9-3.9 8.4 8.4 0 014.5-7.4 8.4 8.4 0 017.9 0A8.4 8.4 0 0121 11.5z"/></svg>`,
  list: `<svg viewBox="0 0 24 24" class="ic"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  back: `<svg viewBox="0 0 24 24" class="ic"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
};

export const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">`;

// Variables CSS compartidas (:root) — colores derivados del color de marca
// del negocio (page.theme_color), con crema fijo como color de acento.
export function themeVars(page) {
  const theme = page.theme_color || "#3d4eac";
  const cream = "#f5e6c8";
  return {
    theme,
    cream,
    onTheme: textOnTheme(theme),
    themeDark: shade(theme, 0.78),
    themeDarker: shade(theme, 0.68),
  };
}

export function rootCss(v) {
  return `--theme:${v.theme}; --theme-dark:${v.themeDark}; --theme-darker:${v.themeDarker}; --cream:${v.cream}; --on-theme:${v.onTheme};`;
}

export const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:"Sora",sans-serif;background:var(--cream);color:#2c2a22;}
  .ic{width:17px;height:17px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
  .cta{display:flex;align-items:center;justify-content:center;gap:9px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:16px 20px;border-radius:50px;transition:transform .2s,background .2s,color .2s;}
  .cta svg{width:18px;height:18px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
  .cta-main{background:var(--cream);color:var(--theme);}
  .cta-main:hover{transform:translateY(-2px);}
  .cta-alt{background:transparent;color:var(--on-theme);border:2px solid var(--on-theme);}
  .cta-alt:hover{background:var(--on-theme);color:var(--theme);transform:translateY(-2px);}
  footer{max-width:900px;margin:16px auto 100px;padding:0 20px;text-align:center;color:#8a8272;font-size:12px;}
  footer a{color:#8a8272;}
`;

export function notFoundPage(html) {
  return html(
    `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menú no encontrado — GoGo</title>
    ${FONT_LINKS}
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:"Sora",sans-serif;background:#3d4eac;color:#f5e6c8;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;}
      div{max-width:360px;}h1{font-size:22px;margin-bottom:10px;font-weight:800;}p{opacity:0.85;font-size:14px;line-height:1.5;}
    </style></head>
    <body><div><h1>No encontramos este menú</h1><p>Puede que el enlace esté mal escrito o que el negocio todavía no haya publicado su menú.</p></div></body></html>`,
    404
  );
}
