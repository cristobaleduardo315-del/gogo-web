import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
import { getLealtadSummary, getLealtadCustomers, getLealtadQrScans } from "../lib/internalApi.js";
import { listQrScansByDay } from "../lib/menuData.js";
import { buildDateRangeSeries, qrScansChartSvg, qrScansTotals, QR_CHART_COLORS } from "../lib/qrStatsChart.js";

const QR_STATS_DEFAULT_DAYS = 14;
const QR_STATS_MAX_RANGE_DAYS = 92; // ~3 meses, para no dejar crecer la gráfica/consultas sin límite
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function daysAgoIso(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return isoDate(d);
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  let summary = null;
  let customers = [];
  if (merchant.lealtad_merchant_id) {
    const [summaryRes, customersRes] = await Promise.all([
      getLealtadSummary(env, merchant.lealtad_merchant_id),
      getLealtadCustomers(env, merchant.lealtad_merchant_id),
    ]);
    if (summaryRes.ok) summary = summaryRes.data;
    if (customersRes.ok) customers = (customersRes.data.customers || []).slice(0, 6);
  }

  // Estadística de escaneos de QR (menú + inscripción a fidelización), por
  // día, para el control estadístico que pidió el negocio. Cada servicio
  // guarda su propio historial (ver migrations/0008 acá y 0005 en
  // gogo-lealtad); se combinan recién acá para la gráfica. Si alguna de las
  // dos falla (p. ej. falta correr una migración, o gogo-lealtad no
  // responde) no debe tumbar el resto del Resumen -- se ve esa serie en 0.
  //
  // El período se elige con ?from=YYYY-MM-DD&to=YYYY-MM-DD (selector de
  // fechas del dashboard); si no vienen o son inválidos, cae al rango por
  // defecto de los últimos QR_STATS_DEFAULT_DAYS días.
  const todayIso = isoDate(new Date());
  const reqUrl = new URL(request.url);
  let fromParam = reqUrl.searchParams.get("from");
  let toParam = reqUrl.searchParams.get("to");
  if (!DATE_RE.test(fromParam || "")) fromParam = daysAgoIso(QR_STATS_DEFAULT_DAYS - 1);
  if (!DATE_RE.test(toParam || "")) toParam = todayIso;
  if (fromParam > toParam) [fromParam, toParam] = [toParam, fromParam];
  if (toParam > todayIso) toParam = todayIso;
  const rangeSpanDays = Math.round((Date.parse(`${toParam}T00:00:00Z`) - Date.parse(`${fromParam}T00:00:00Z`)) / 86400000) + 1;
  if (rangeSpanDays > QR_STATS_MAX_RANGE_DAYS) {
    const cappedStart = new Date(Date.parse(`${toParam}T00:00:00Z`));
    cappedStart.setUTCDate(cappedStart.getUTCDate() - (QR_STATS_MAX_RANGE_DAYS - 1));
    fromParam = isoDate(cappedStart);
  }
  const since = Date.parse(`${fromParam}T00:00:00Z`);
  const until = Date.parse(`${toParam}T00:00:00Z`) + 24 * 60 * 60 * 1000;
  let menuScans = [];
  let debugMenuError = null;
  try {
    menuScans = await listQrScansByDay(env.DB, merchant.id, since, until);
  } catch (err) {
    console.error("listQrScansByDay (menu):", err.message || err);
    debugMenuError = err.message || String(err);
  }
  let lealtadScans = [];
  let debugLealtadError = null;
  if (merchant.lealtad_merchant_id) {
    const qrRes = await getLealtadQrScans(env, merchant.lealtad_merchant_id, { from: fromParam, to: toParam });
    if (qrRes.ok) {
      lealtadScans = qrRes.data.scans || [];
      if (qrRes.data.debug) debugLealtadError = qrRes.data.debug;
    } else {
      debugLealtadError = `qrRes not ok: status=${qrRes.status}`;
    }
  }
  const qrSeries = buildDateRangeSeries(menuScans, lealtadScans, fromParam, toParam);
  const qrTotals = qrScansTotals(qrSeries);
  const qrPresets = [
    { label: "7 días", days: 7 },
    { label: "14 días", days: 14 },
    { label: "30 días", days: 30 },
    { label: "90 días", days: 90 },
  ];

  const rows = customers
    .map(
      (c) => `<tr>
        <td><div class="cust-cell"><div class="cust-avatar">${escapeHtml((c.name || "?").slice(0, 2).toUpperCase())}</div>${escapeHtml(c.name)}</div></td>
        <td class="muted">${c.stamp_count} / ${summary ? summary.stamps_required : "-"}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="topbar">
      <div>
        <h1>Hola, ${escapeHtml(merchant.business_name)}</h1>
        <p>Así va tu negocio en GoGo</p>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Clientes en fidelización</span></div>
        <div class="kpi-value">${summary ? summary.customer_count : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Meta de sellos</span></div>
        <div class="kpi-value">${summary ? summary.stamps_required : "—"}</div>
        <div class="muted" style="margin-top:6px;font-size:12.5px;">${summary ? escapeHtml(summary.reward_text) : "Vincula tu programa de fidelización"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Plan actual</span></div>
        <div class="kpi-value" style="font-size:20px;text-transform:capitalize;">${escapeHtml(merchant.plan)}</div>
      </div>
    </div>

    <div class="row-2">
      <div class="card">
        <div class="card-head">
          <div><h3>Clientes recientes</h3><div class="sub">Programa de fidelización</div></div>
          <a class="btn ghost" href="/panel/fidelizacion">Ver todos</a>
        </div>
        <div class="table-scroll">
        <table>
          <thead><tr><th>Cliente</th><th>Sellos</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2" class="muted">Todavía no tienes clientes inscritos.</td></tr>'}</tbody>
        </table>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Accesos rápidos</h3></div></div>
        <a class="btn" style="display:block;text-align:center;margin-bottom:10px;" href="/panel/fidelizacion">Escanear cliente</a>
        <a class="btn ghost" style="display:block;text-align:center;margin-bottom:10px;" href="/panel/mi-pagina">Editar mi página</a>
        <a class="btn ghost" style="display:block;text-align:center;" href="/panel/configuracion">Configuración</a>
      </div>
    </div>

    <div class="card" data-wide>
      <div class="card-head">
        <div><h3>Escaneos de QR</h3><div class="sub">${escapeHtml(fromParam)} a ${escapeHtml(toParam)} — menú y programa de fidelización</div></div>
      </div>
      <form method="GET" action="/panel" style="display:flex;gap:16px;flex-wrap:wrap;align-items:end;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${qrPresets
            .map(
              (p) =>
                `<a class="btn ghost" style="padding:6px 12px;font-size:12.5px;" href="/panel?from=${daysAgoIso(p.days - 1)}&to=${todayIso}">${p.label}</a>`
            )
            .join("")}
        </div>
        <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;">
          <label style="font-size:11.5px;color:var(--text-dim);font-weight:600;">Desde
            <input type="date" name="from" value="${escapeHtml(fromParam)}" max="${todayIso}" style="display:block;margin-top:4px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--panel);color:var(--text);"/>
          </label>
          <label style="font-size:11.5px;color:var(--text-dim);font-weight:600;">Hasta
            <input type="date" name="to" value="${escapeHtml(toParam)}" max="${todayIso}" style="display:block;margin-top:4px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--panel);color:var(--text);"/>
          </label>
          <button class="btn" type="submit" style="padding:8px 18px;">Aplicar</button>
        </div>
      </form>
      <div style="display:flex;gap:22px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:11px;height:11px;border-radius:3px;background:${QR_CHART_COLORS.menu};display:inline-block;flex-shrink:0;"></span>
          <span class="muted" style="font-size:13px;">Menú — <strong style="color:var(--text);">${qrTotals.menu}</strong></span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:11px;height:11px;border-radius:3px;background:${QR_CHART_COLORS.fidelizacion};display:inline-block;flex-shrink:0;"></span>
          <span class="muted" style="font-size:13px;">Fidelización — <strong style="color:var(--text);">${qrTotals.fidelizacion}</strong></span>
        </div>
      </div>
      ${
        qrTotals.menu + qrTotals.fidelizacion > 0
          ? qrScansChartSvg(qrSeries)
          : `<p class="muted" style="font-size:13px;">Todavía no hay escaneos registrados en este rango. Comparte el QR de tu menú o el de inscripción a fidelización para empezar a ver datos acá.</p>`
      }
    </div>
    <!-- debug-qr-scans: menu=${escapeHtml(debugMenuError || "ok")} | lealtad=${escapeHtml(debugLealtadError || "ok")} -->`;

  return new Response(renderShell({ title: "Resumen", active: "resumen", merchant, bodyHtml: body }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
