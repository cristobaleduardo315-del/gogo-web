import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
import {
  getLealtadSummary,
  getLealtadCustomers,
  getLealtadPromotions,
  getLealtadConfig,
  updateLealtadConfig,
  sendLealtadPromotion,
} from "../lib/internalApi.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Igual límite que gogo-lealtad (src/index.js) para el logo y el ícono de
// sello que se suben desde acá.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function promoRows(promotions) {
  if (!promotions.length) {
    return '<tr><td colspan="3" class="muted">Todavía no has enviado ninguna promoción.</td></tr>';
  }
  return promotions
    .map((p) => {
      const isSent = p.status === "sent";
      return `<tr>
        <td>${escapeHtml(formatDate(p.created_at))}</td>
        <td><strong>${escapeHtml(p.header)}</strong><div class="muted" style="font-size:12px;">${escapeHtml(p.body)}</div></td>
        <td style="color:${isSent ? "var(--lime-text)" : "var(--red)"};font-weight:700;">${isSent ? "Enviada" : "Error"}</td>
      </tr>`;
    })
    .join("");
}

function pageBody(env, merchant, { summary, customers, promotions, config, notice, error }) {
  const rows = customers
    .map(
      (c) => `<tr>
        <td><a href="/panel/fidelizacion/cliente/${encodeURIComponent(c.code)}" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;"><div class="cust-avatar">${escapeHtml((c.name || "?").slice(0, 2).toUpperCase())}</div>${escapeHtml(c.name)}</a></td>
        <td class="muted">${c.stamp_count} / ${summary ? summary.stamps_required : "-"}</td>
        <td class="muted">${escapeHtml(c.code)}</td>
        <td><a class="btn ghost" href="/panel/fidelizacion/cliente/${encodeURIComponent(c.code)}" style="padding:6px 14px;font-size:12.5px;">Gestionar</a></td>
      </tr>`
    )
    .join("");

  const lealtadBase = (env.GOGO_LEALTAD_URL || "").replace(/\/$/, "");
  const cfg = config || {};
  // ?v=timestamp evita que el navegador muestre el logo/ícono viejo desde su
  // caché justo después de guardar uno nuevo (el endpoint que los sirve se
  // cachea 24h para que Google Wallet no lo reconsulte de más). Sin esto, el
  // dueño del negocio ve la vista previa sin cambios y piensa que no se guardó,
  // aunque sí se haya actualizado del lado del servidor.
  const cacheBust = Date.now();
  const logoSrc = cfg.logo_url ? `${lealtadBase}${cfg.logo_url}?v=${cacheBust}` : null;
  const stampIconSrc = cfg.stamp_icon_url ? `${lealtadBase}${cfg.stamp_icon_url}?v=${cacheBust}` : null;
  const joinUrl = summary ? `${lealtadBase}/c/${summary.slug}/unirse` : null;

  return `
    <div class="topbar">
      <div><h1>Fidelización</h1><p>${summary ? escapeHtml(summary.stamps_required + " sellos = " + summary.reward_text) : ""}</p></div>
      <a class="btn" href="/panel/fidelizacion/escanear">Escanear cliente</a>
    </div>

    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}

    <div class="kpi-grid kpi-grid-2">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Clientes inscritos</span></div>
        <div class="kpi-value">${summary ? summary.customer_count : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Meta de sellos</span></div>
        <div class="kpi-value">${summary ? summary.stamps_required : "—"}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;max-width:560px;">
      <div class="card-head">
        <div><h3>Personalizar tarjeta</h3><div class="sub">Así se ve la tarjeta de sellos que guardan tus clientes en Google Wallet.</div></div>
      </div>
      <form class="inline" method="POST" action="/panel/fidelizacion" enctype="multipart/form-data">
        <input type="hidden" name="action" value="personalizar">
        <label>Sellos necesarios para la recompensa</label>
        <input name="stamps_required" type="number" min="1" max="50" required value="${cfg.stamps_required || (summary ? summary.stamps_required : 10)}">
        <label>Descripción de la recompensa</label>
        <input name="reward_text" required value="${escapeHtml(cfg.reward_text || (summary ? summary.reward_text : ""))}">
        <label>Color de marca</label>
        <input name="brand_color" type="color" value="${escapeHtml(cfg.brand_color || (summary ? summary.brand_color : "#ccff00"))}" style="height:44px;padding:4px;">
        <label>Logo del negocio</label>
        ${logoSrc ? `<img src="${escapeHtml(logoSrc)}" alt="Logo actual" style="width:56px;height:56px;object-fit:contain;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;background:#fff;">` : ""}
        <input name="logo_file" type="file" accept="image/png,image/jpeg,image/gif">
        <label>Ícono del sello</label>
        ${stampIconSrc ? `<img src="${escapeHtml(stampIconSrc)}" alt="Ícono actual" style="width:56px;height:56px;object-fit:contain;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;background:#fff;">` : ""}
        <input name="stamp_icon_file" type="file" accept="image/png,image/jpeg,image/gif">
        <p class="muted" style="margin-top:10px;font-size:12px;">Imágenes PNG, JPG o GIF hasta 2MB (no .webp). Si no subes una nueva, se conserva la actual.</p>
        <button class="btn" type="submit" style="margin-top:18px;">Guardar tarjeta</button>
      </form>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-head">
        <div><h3>Enviar promoción</h3><div class="sub">Llega como notificación push a quien tenga la tarjeta guardada en Google Wallet${summary ? ` (de tus ${summary.customer_count} clientes inscritos)` : ""}.</div></div>
      </div>
      <form class="inline" method="POST" action="/panel/fidelizacion">
        <input type="hidden" name="action" value="promo">
        <label>Título</label>
        <input name="header" required maxlength="30" placeholder="Ej. 2x1 hoy">
        <label>Mensaje</label>
        <textarea name="body" required maxlength="300" placeholder="Ej. Trae a un amigo y ambos comen gratis en su segunda visita."></textarea>
        <button class="btn" type="submit" style="margin-top:18px;">Enviar notificación</button>
      </form>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-head"><div><h3>Historial de promociones</h3><div class="sub">Últimas enviadas</div></div></div>
      <div class="table-scroll">
      <table>
        <thead><tr><th>Fecha</th><th>Promoción</th><th>Estado</th></tr></thead>
        <tbody>${promoRows(promotions)}</tbody>
      </table>
      </div>
    </div>

    ${
      joinUrl
        ? `<div class="card" style="margin-bottom:16px;max-width:560px;">
      <div class="card-head"><div><h3>Enlace de inscripción</h3><div class="sub">Compártelo para que tus clientes se unan al programa</div></div></div>
      <input readonly value="${escapeHtml(joinUrl)}" onclick="this.select()" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;">
      <a class="btn ghost" href="${escapeHtml(joinUrl)}" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:10px;">Abrir formulario de inscripción</a>
    </div>`
        : ""
    }

    <div class="card" data-wide>
      <div class="card-head">
        <div><h3>Clientes</h3><div class="sub">Los más recientes</div></div>
      </div>
      <div class="table-scroll">
      <table>
        <thead><tr><th>Cliente</th><th>Sellos</th><th>Código</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="muted">Todavía no tienes clientes inscritos.</td></tr>'}</tbody>
      </table>
      </div>
    </div>`;
}

async function loadData(env, merchant) {
  const [summaryRes, customersRes, promosRes, configRes] = await Promise.all([
    getLealtadSummary(env, merchant.lealtad_merchant_id),
    getLealtadCustomers(env, merchant.lealtad_merchant_id),
    getLealtadPromotions(env, merchant.lealtad_merchant_id),
    getLealtadConfig(env, merchant.lealtad_merchant_id),
  ]);
  return {
    summary: summaryRes.ok ? summaryRes.data : null,
    customers: customersRes.ok ? customersRes.data.customers || [] : [],
    promotions: promosRes.ok ? promosRes.data.promotions || [] : [],
    config: configRes.ok ? configRes.data : null,
  };
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  if (!merchant.lealtad_merchant_id) {
    const body = `
      <div class="topbar"><div><h1>Fidelización</h1><p>Tu programa de sellos.</p></div></div>
      <div class="card"><p class="muted">Tu cuenta todavía no tiene un programa de fidelización vinculado. Escríbenos para activarlo.</p></div>`;
    return html(renderShell({ title: "Fidelización", active: "fidelizacion", merchant, bodyHtml: body }));
  }

  // notice/error llegan como query string tras el redirect tipo POST →
  // redirect → GET tras enviar una promoción (ver onRequestPost). Evita
  // reenviar el formulario si el usuario refresca la página.
  const url = new URL(request.url);
  const notice = url.searchParams.get("notice") || undefined;
  const error = url.searchParams.get("error") || undefined;

  const data = await loadData(env, merchant);
  return html(
    renderShell({
      title: "Fidelización",
      active: "fidelizacion",
      merchant,
      bodyHtml: pageBody(env, merchant, { ...data, notice, error }),
    })
  );
}

export async function onRequestPost(context) {
  // Red de seguridad: cualquier excepción no prevista dentro de handlePost
  // (antes causaba un 502 "Host Error" genérico de Cloudflare, sin detalle
  // y sin poder atraparse) se registra en los logs y el usuario vuelve al
  // formulario con un mensaje legible en vez de una pantalla rota.
  try {
    return await handlePost(context);
  } catch (err) {
    console.error("POST /panel/fidelizacion:", err && err.stack ? err.stack : err);
    const qs = "error=" + encodeURIComponent("Ocurrió un error inesperado. Intenta de nuevo.");
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
  }
}

// Patrón POST → redirect → GET: la respuesta del POST solo hace la llamada
// a sendLealtadPromotion y redirige de inmediato (sin volver a consultar
// loadData ni renderizar HTML aquí). El GET que sigue al redirect ya está
// probado y es confiable; esto reduce al mínimo el trabajo que hace la
// función en el propio POST.
async function handlePost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  if (!merchant.lealtad_merchant_id) {
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion" } });
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "promo");

  if (action === "personalizar") {
    return handlePersonalizar({ formData, env, merchant });
  }

  const header = String(formData.get("header") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!header || !body) {
    const qs = "error=" + encodeURIComponent("Completa el título y el mensaje.");
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
  }

  const result = await sendLealtadPromotion(env, merchant.lealtad_merchant_id, { header, body });
  const qs = result.ok
    ? "notice=" + encodeURIComponent("Promoción enviada.")
    : "error=" + encodeURIComponent(result.data?.error || "No se pudo enviar la notificación.");
  return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
}

// Guarda sellos/recompensa/color/logo/ícono de la tarjeta de fidelización.
// Las imágenes son opcionales: si el negocio no sube un archivo nuevo, se
// conserva el que ya tenía (gogo-lealtad hace el COALESCE del lado de la
// base de datos, acá solo evitamos mandar algo si no hay archivo).
async function handlePersonalizar({ formData, env, merchant }) {
  const stampsRequired = parseInt(formData.get("stamps_required"), 10);
  const rewardText = String(formData.get("reward_text") || "").trim();
  const brandColor = String(formData.get("brand_color") || "#ccff00");

  if (!rewardText || !stampsRequired || stampsRequired < 1) {
    const qs = "error=" + encodeURIComponent("Revisa los campos, hay algo inválido.");
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
  }

  // Formatos aceptados para logo/ícono de sello: el banner de sellos de
  // Google Wallet se dibuja del lado del servidor incrustando esta imagen
  // dentro de un SVG que después se convierte a PNG (resvg) — esa librería
  // sabe leer PNG/JPG/GIF pero NO webp. Si se sube un .webp (cada vez más
  // común: así exportan capturas de pantalla varios celulares/navegadores),
  // el archivo se guardaba igual pero la imagen quedaba invisible en la
  // tarjeta sin ningún error visible — daba la impresión de que "no se
  // actualiza". Se valida el formato acá para avisar de una vez.
  const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif"];

  let logoImage = null;
  let logoMime = null;
  const logoFile = formData.get("logo_file");
  if (logoFile && typeof logoFile === "object" && logoFile.size > 0) {
    if (!logoFile.type || !ALLOWED_IMAGE_TYPES.includes(logoFile.type)) {
      const qs = "error=" + encodeURIComponent("El logo debe ser una imagen PNG, JPG o GIF (no se aceptan .webp).");
      return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
    }
    if (logoFile.size > MAX_IMAGE_BYTES) {
      const qs = "error=" + encodeURIComponent("El logo es muy pesado (máx. 2MB).");
      return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
    }
    logoImage = await fileToBase64(logoFile);
    logoMime = logoFile.type;
  }

  let stampIconImage = null;
  let stampIconMime = null;
  const stampFile = formData.get("stamp_icon_file");
  if (stampFile && typeof stampFile === "object" && stampFile.size > 0) {
    if (!stampFile.type || !ALLOWED_IMAGE_TYPES.includes(stampFile.type)) {
      const qs = "error=" + encodeURIComponent("El ícono de sello debe ser una imagen PNG, JPG o GIF (no se aceptan .webp).");
      return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
    }
    if (stampFile.size > MAX_IMAGE_BYTES) {
      const qs = "error=" + encodeURIComponent("El ícono de sello es muy pesado (máx. 2MB).");
      return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
    }
    stampIconImage = await fileToBase64(stampFile);
    stampIconMime = stampFile.type;
  }

  const result = await updateLealtadConfig(env, merchant.lealtad_merchant_id, {
    business_name: merchant.business_name,
    stamps_required: stampsRequired,
    reward_text: rewardText,
    brand_color: brandColor,
    logo_image: logoImage,
    logo_mime: logoMime,
    stamp_icon_image: stampIconImage,
    stamp_icon_mime: stampIconMime,
  });
  const qs = result.ok
    ? "notice=" + encodeURIComponent("Tarjeta actualizada.")
    : "error=" + encodeURIComponent(result.data?.error || "No se pudo guardar la tarjeta.");
  return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
}
