// Gráfica de barras de "escaneos de QR por día" para el dashboard (Resumen).
// Dos series -- Menú (functions/menu/[slug]/qr.js, en la propia D1 de
// gogo-web) y Fidelización (/c/:slug/qr en gogo-lealtad, vía API interna) --
// se combinan acá en una sola serie diaria y se dibujan como SVG inline (sin
// depender de ninguna librería de gráficas: mismo enfoque ya usado para los
// QR y la imagen de sellos de Wallet, generado a mano del lado del
// servidor).

function dateKeyDaysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDayLabel(day) {
  const parts = String(day || "").split("-");
  if (parts.length !== 3) return day;
  return `${parts[2]}/${parts[1]}`;
}

// Junta las dos series (filas {day, count} de cada servicio) en una lista de
// `days` puntos consecutivos terminando hoy, rellenando con 0 los días sin
// escaneos -- así la gráfica siempre muestra el rango completo aunque un
// negocio nuevo no tenga historial todavía.
export function buildDailySeries(menuRows, lealtadRows, days = 14) {
  const menuMap = new Map((menuRows || []).map((r) => [r.day, Number(r.count) || 0]));
  const lealtadMap = new Map((lealtadRows || []).map((r) => [r.day, Number(r.count) || 0]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dateKeyDaysAgo(i);
    out.push({ day, menu: menuMap.get(day) || 0, fidelizacion: lealtadMap.get(day) || 0 });
  }
  return out;
}

// Igual que buildDailySeries, pero para un rango de fechas explícito
// (fromDate/toDate en YYYY-MM-DD, inclusive) -- lo que usa el selector de
// fechas del dashboard en vez de un número fijo de "últimos N días".
export function buildDateRangeSeries(menuRows, lealtadRows, fromDate, toDate) {
  const menuMap = new Map((menuRows || []).map((r) => [r.day, Number(r.count) || 0]));
  const lealtadMap = new Map((lealtadRows || []).map((r) => [r.day, Number(r.count) || 0]));
  const out = [];
  const start = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    out.push({ day, menu: menuMap.get(day) || 0, fidelizacion: lealtadMap.get(day) || 0 });
  }
  return out;
}

const COLOR_MENU = "#3d4eac";
const COLOR_FIDELIZACION = "#ccff00";

// SVG de barras agrupadas (2 por día): viewBox fijo, pero se escala al ancho
// real de la tarjeta vía CSS (width:100%) -- se ve bien tanto en escritorio
// como en celular sin tener que recalcular nada según el viewport.
export function qrScansChartSvg(series) {
  const width = 900;
  const height = 220;
  const padLeft = 32;
  const padRight = 10;
  const padTop = 16;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const n = Math.max(1, series.length);
  const groupW = chartW / n;
  const barGap = groupW * 0.12;
  const barW = Math.max(1, (groupW - barGap * 3) / 2);
  const maxVal = Math.max(1, ...series.map((d) => Math.max(d.menu, d.fidelizacion)));

  const gridLines = [0, 0.5, 1]
    .map((f) => {
      const y = padTop + chartH * (1 - f);
      const val = Math.round(maxVal * f);
      return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" stroke="#e6e6e1" stroke-width="1"/>
        <text x="${(padLeft - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="11" fill="#6b6b6b">${val}</text>`;
    })
    .join("");

  // Con rangos largos (p. ej. 90 días) no caben todas las etiquetas de
  // fecha sin encimarse -- se muestra solo 1 de cada `labelEvery` días,
  // siempre incluyendo el último para que se vea el día más reciente.
  const labelEvery = n > 20 ? Math.ceil(n / 15) : 1;

  const bars = series
    .map((d, i) => {
      const gx = padLeft + i * groupW;
      const menuH = (d.menu / maxVal) * chartH;
      const fidH = (d.fidelizacion / maxVal) * chartH;
      const menuX = gx + barGap;
      const fidX = menuX + barW + barGap;
      const menuY = padTop + chartH - menuH;
      const fidY = padTop + chartH - fidH;
      const label = formatDayLabel(d.day);
      // Alto mínimo de 2px para que una barra con al menos 1 escaneo se
      // alcance a ver -- si no, con valores chicos comparados al máximo del
      // rango, la barra podía quedar en 0px y parecer que no hubo escaneos.
      const menuBar = d.menu
        ? `<rect x="${menuX.toFixed(1)}" y="${menuY.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(menuH, 2).toFixed(1)}" rx="2" fill="${COLOR_MENU}"><title>${label} · Menú: ${d.menu}</title></rect>`
        : "";
      const fidBar = d.fidelizacion
        ? `<rect x="${fidX.toFixed(1)}" y="${fidY.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(fidH, 2).toFixed(1)}" rx="2" fill="${COLOR_FIDELIZACION}"><title>${label} · Fidelización: ${d.fidelizacion}</title></rect>`
        : "";
      const showLabel = i % labelEvery === 0 || i === series.length - 1;
      const labelText = showLabel
        ? `<text x="${(gx + groupW / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#6b6b6b">${label}</text>`
        : "";
      return `${menuBar}${fidBar}${labelText}`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;" role="img" aria-label="Escaneos de QR por día">
    ${gridLines}
    ${bars}
  </svg>`;
}

export function qrScansTotals(series) {
  return series.reduce(
    (acc, d) => ({ menu: acc.menu + d.menu, fidelizacion: acc.fidelizacion + d.fidelizacion }),
    { menu: 0, fidelizacion: 0 }
  );
}

export const QR_CHART_COLORS = { menu: COLOR_MENU, fidelizacion: COLOR_FIDELIZACION };
