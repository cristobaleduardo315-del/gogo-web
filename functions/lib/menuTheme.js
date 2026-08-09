// Piezas visuales compartidas entre las dos páginas públicas del menú
// (la portada en [slug].js y la carta en [slug]/carta.js). El HTML/CSS/JS de
// estas dos páginas es un port fiel del diseño que ya existía en Shopify
// (theme_export de West Burger, Agosto 2026): mismos colores, tipografía
// Sora, animaciones de fondo, botones e íconos dibujados a mano para cada
// categoría. La estructura (portada + carta como dos páginas separadas, con
// índice de categorías y acordeón en la carta) se copió literal del archivo
// custom_liquid original; solo lo que antes eran textos/productos fijos de
// West Burger ahora sale de D1 (menu_pages/menu_categories/menu_products).
//
// El color de marca y el logo salen de menu_pages (theme_color/logo_url),
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

export const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;700&display=swap" rel="stylesheet">`;

// Variables CSS compartidas (:root) — colores derivados del color de marca
// del negocio (page.theme_color). Los tonos oscuros usados en la carta
// (fondo de imagen de producto, hover de botones) en el Shopify original
// eran #2F3D8A y #2A3878 — ambos caen casi exactos multiplicando el color
// base por ~0.78 y ~0.68, así que se calculan igual para cualquier color.
export function themeVars(page) {
  const theme = page.theme_color || "#3d4eac";
  return {
    theme,
    cream: "#f5e6c8",
    themeDark: shade(theme, 0.78),
    themeDarker: shade(theme, 0.68),
  };
}

export function rootCss(v) {
  return `--theme:${v.theme}; --theme-dark:${v.themeDark}; --theme-darker:${v.themeDarker}; --cream:${v.cream};`;
}

// Ícono de "volver" (única pieza que se reutiliza en las dos páginas).
export const BACK_ICON = `<svg viewBox="0 0 24 24" class="wb-back-ic"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

export function notFoundPage(html) {
  return html(
    `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menú no encontrado — GoGo</title>
    ${FONT_LINKS}
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:"Sora",sans-serif;background:#3d4eac;color:#f5e6c8;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;}
      div{max-width:360px;}h1{font-size:22px;margin-bottom:10px;font-weight:700;}p{opacity:0.85;font-size:14px;line-height:1.5;}
    </style></head>
    <body><div><h1>No encontramos este menú</h1><p>Puede que el enlace esté mal escrito o que el negocio todavía no haya publicado su menú.</p></div></body></html>`,
    404
  );
}

// --- Íconos de comida (carta) --------------------------------------------
// Dibujados a mano para el menú original de West Burger. Se referencian por
// id via <use href="#ic-...">; categoryIconId() elige uno según el nombre
// de la categoría para que sirva con las categorías de cualquier negocio,
// no solo las 9 que tenía West Burger.
export const FOOD_ICON_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="ic-burger" viewBox="0 0 64 64">
      <path d="M10 28a22 12 0 0 1 44 0z"/>
      <circle cx="24" cy="22" r="1"/><circle cx="34" cy="19" r="1"/><circle cx="43" cy="23" r="1"/>
      <path d="M10 32l6 4 6-4 6 4 6-4 6 4 6-4 4 2"/>
      <rect x="11" y="38" width="42" height="8" rx="4"/>
      <path d="M11 48h42v3a8 8 0 0 1-8 8H19a8 8 0 0 1-8-8z"/>
    </symbol>
    <symbol id="ic-patacon" viewBox="0 0 64 64">
      <ellipse cx="32" cy="22" rx="19" ry="7"/>
      <path d="M13 22v6c0 3 4 5 8 5"/>
      <path d="M51 22v6c0 3-4 5-8 5"/>
      <rect x="15" y="34" width="34" height="7" rx="3.5"/>
      <ellipse cx="32" cy="48" rx="19" ry="7"/>
      <path d="M13 42v6"/><path d="M51 42v6"/>
    </symbol>
    <symbol id="ic-hotdog" viewBox="0 0 64 64">
      <path d="M15 44a10 10 0 0 1 0-20h34a10 10 0 0 1 0 20z"/>
      <rect x="18" y="28" width="28" height="9" rx="4.5"/>
      <path d="M20 32l5-3 5 3 5-3 5 3 4-3"/>
      <path d="M10 34h4"/><path d="M50 34h4"/>
    </symbol>
    <symbol id="ic-fries" viewBox="0 0 64 64">
      <path d="M20 30h24l-4 26H24z"/>
      <path d="M20 38h24"/>
      <path d="M24 30l-2-14"/><path d="M30 30V14"/><path d="M36 30V16"/><path d="M42 30l3-13"/>
    </symbol>
    <symbol id="ic-nuggets" viewBox="0 0 64 64">
      <path d="M20 26a8 7 0 0 1 14 0 6 6 0 0 1-2 11 8 7 0 0 1-13-4 6 6 0 0 1 1-7z"/>
      <path d="M38 36a7 6 0 0 1 12 0 5 5 0 0 1-2 9 7 6 0 0 1-11-3 5 5 0 0 1 1-6z"/>
    </symbol>
    <symbol id="ic-combo" viewBox="0 0 64 64">
      <path d="M5 32a12 7 0 0 1 24 0z"/>
      <rect x="6" y="36" width="22" height="6" rx="3"/>
      <path d="M6 44h22v2a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z"/>
      <path d="M36 24h22l-3 28a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5z"/>
      <path d="M34 24h26"/><path d="M50 24l5-10"/>
    </symbol>
    <symbol id="ic-bowl" viewBox="0 0 64 64">
      <path d="M10 32h44a22 22 0 0 1-44 0z"/>
      <path d="M8 32h48"/>
      <path d="M24 26l-3-10"/><path d="M32 26V14"/><path d="M40 26l3-11"/>
      <path d="M24 54h16"/>
    </symbol>
    <symbol id="ic-onion" viewBox="0 0 64 64">
      <circle cx="24" cy="38" r="13"/><circle cx="24" cy="38" r="6"/>
      <circle cx="42" cy="26" r="11"/><circle cx="42" cy="26" r="5"/>
    </symbol>
    <symbol id="ic-cup" viewBox="0 0 64 64">
      <path d="M19 22h26l-4 32a5 5 0 0 1-5 4h-8a5 5 0 0 1-5-4z"/>
      <path d="M17 22h30"/><path d="M36 22l7-12"/><path d="M22 36h20"/>
    </symbol>
    <symbol id="ic-star" viewBox="0 0 64 64">
      <path d="M32 8l7.4 15.6L56 26l-12 12.2L46.8 56 32 47.6 17.2 56 20 38.2 8 26l16.6-2.4z"/>
    </symbol>
    <symbol id="ic-kid" viewBox="0 0 64 64">
      <circle cx="32" cy="20" r="10"/>
      <path d="M32 30v14"/><path d="M32 34l-10 6"/><path d="M32 34l10 6"/>
      <path d="M32 44l-8 12"/><path d="M32 44l8 12"/>
    </symbol>
    <symbol id="ic-cart" viewBox="0 0 24 24">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </symbol>
    <symbol id="ic-plus" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14"/>
    </symbol>
    <symbol id="ic-trash" viewBox="0 0 24 24">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    </symbol>
    <symbol id="ic-wa" viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2z"/>
      <path d="M8.5 8c-.3 0-.6.1-.8.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.9 4.5 3.9 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.6-.3z"/>
    </symbol>
  </defs>
</svg>`;

const CATEGORY_ICON_RULES = [
  [/hamburgues|burger/, "ic-burger"],
  [/patac/, "ic-patacon"],
  [/hot ?dog|perro/, "ic-hotdog"],
  [/salchipapa|papa/, "ic-fries"],
  [/nugget|infantil|niñ|kid/, "ic-kid"],
  [/combo/, "ic-combo"],
  [/adicional|extra/, "ic-onion"],
  [/bebida|drink|gaseosa|jugo/, "ic-cup"],
  [/especial/, "ic-star"],
];

function stripAccents(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function categoryIconId(categoryName) {
  const normalized = stripAccents(categoryName).toLowerCase();
  for (const [pattern, id] of CATEGORY_ICON_RULES) {
    if (pattern.test(normalized)) return id;
  }
  return "ic-star";
}

// Convierte un valor a un literal JS seguro para incrustar dentro de un
// atributo HTML de doble comilla (ej. onclick="addToCart(..., ATTR, ...)").
// JSON.stringify ya escapa comillas simples/backslashes correctamente para
// JS; solo falta neutralizar la comilla doble que delimita el atributo.
export function jsAttr(value) {
  return JSON.stringify(value).replace(/"/g, "&quot;");
}
