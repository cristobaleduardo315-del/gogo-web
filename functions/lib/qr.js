// Genera el <svg> del código QR del menú público de un negocio. Mismo
// enfoque que gogo-lealtad/src/lib/qr.js (SVG inline, sin depender de un
// servicio externo), pero usando la librería vendorizada en qrcodeLib.js
// en vez del paquete npm "qrcode", porque este proyecto no tiene paso de
// build/npm install (ver nota en qrcodeLib.js).
import { qrcode } from "./qrcodeLib.js";

// cellSize/margin en píxeles "de módulo" del QR (no de la imagen final): a
// mayor cellSize, más grande se ve. typeNumber 0 = deja que la librería
// elija automáticamente la versión más chica que alcance para el texto.
export function qrSvg(text, { cellSize = 6, margin = 16 } = {}) {
  const qr = qrcode(0, "M");
  qr.addData(String(text));
  qr.make();
  return qr.createSvgTag(cellSize, margin);
}

// Para el botón de "Descargar" del panel: el mismo SVG, como data URL lista
// para usar en un <a href download>. btoa existe en el runtime de
// Cloudflare Workers; el SVG generado es puro ASCII (paths y XML), así que
// no hay problema de codificación.
export function qrSvgDataUrl(text, opts) {
  const svg = qrSvg(text, opts);
  return "data:image/svg+xml;base64," + btoa(svg);
}
