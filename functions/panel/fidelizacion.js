import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
import { qrSvg, qrSvgDataUrl } from "../lib/qr.js";
import {
  getLealtadSummary,
  getLealtadCustomers,
  getLealtadPromotions,
  getLealtadConfig,
  updateLealtadConfig,
  updateLealtadLocation,
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
  // El QR codifica esta ruta separada (no joinUrl directo) para poder contar
  // cuántas personas se inscribieron escaneando el QR físico -- ver
  // /c/:slug/qr en gogo-lealtad y la gráfica de "Escaneos de QR" en Resumen.
  const joinQrUrl = summary ? `${lealtadBase}/c/${summary.slug}/qr` : null;

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

    <div class="card" style="margin-bottom:16px;max-width:560px;">
      <div class="card-head">
        <div><h3>Recordatorio de cercanía</h3><div class="sub">Con la ubicación de tu negocio guardada, a los clientes que tengan la tarjeta en Google Wallet les puede aparecer un aviso en el celular cuando estén cerca -- sin que tengas que hacer nada más.</div></div>
      </div>
      <div style="margin-bottom:18px;">
        <label style="display:block;font-weight:700;font-size:13px;margin-bottom:6px;">Buscar en Google Maps</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="f_maps_query" placeholder="Ej. ${escapeHtml(merchant.business_name || "Mi negocio")}, ciudad" style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;">
          <button type="button" class="btn ghost" id="btnBuscarMaps" style="flex-shrink:0;">Buscar</button>
        </div>
        <div id="mapsResults" style="margin-top:10px;"></div>
        <p class="muted" style="margin-top:8px;font-size:12px;">Elige la ficha correcta de tu negocio y las coordenadas de abajo se llenan solas.</p>
      </div>
      <form class="inline" method="POST" action="/panel/fidelizacion">
        <input type="hidden" name="action" value="ubicacion">
        <button type="button" class="btn ghost" id="btnUsarUbicacion" style="margin:4px 0 16px;">Usar mi ubicación actual</button>
        <label>Latitud</label>
        <input name="latitude" id="f_latitude" type="number" step="any" min="-90" max="90" value="${cfg.latitude != null ? escapeHtml(String(cfg.latitude)) : ""}" placeholder="Ej. 4.438900">
        <label>Longitud</label>
        <input name="longitude" id="f_longitude" type="number" step="any" min="-180" max="180" value="${cfg.longitude != null ? escapeHtml(String(cfg.longitude)) : ""}" placeholder="Ej. -75.232200">
        <p class="muted" style="margin-top:8px;font-size:12px;">O usa el botón de arriba mientras estás parado en el negocio, o ingresa las coordenadas a mano.</p>
        <button class="btn" type="submit" style="margin-top:18px;">Guardar ubicación</button>
      </form>
    </div>
    <script>
    (function () {
      var btn = document.getElementById('btnUsarUbicacion');
      if (btn) {
        btn.addEventListener('click', function () {
          if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización. Puedes ingresar las coordenadas a mano.');
            return;
          }
          var original = btn.textContent;
          btn.disabled = true;
          btn.textContent = 'Obteniendo ubicación...';
          navigator.geolocation.getCurrentPosition(
            function (pos) {
              document.getElementById('f_latitude').value = pos.coords.latitude.toFixed(6);
              document.getElementById('f_longitude').value = pos.coords.longitude.toFixed(6);
              btn.disabled = false;
              btn.textContent = original;
            },
            function () {
              alert('No se pudo obtener tu ubicación. Revisa los permisos del navegador o ingresa las coordenadas a mano.');
              btn.disabled = false;
              btn.textContent = original;
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }

      // Buscador de "Recordatorio de cercanía": busca el negocio en Google
      // Maps (Places API, vía /panel/fidelizacion/buscar-ubicacion) y deja
      // elegir la ficha correcta para llenar lat/lng automáticamente, en vez
      // de tener que copiarlas a mano.
      var searchBtn = document.getElementById('btnBuscarMaps');
      var queryInput = document.getElementById('f_maps_query');
      var resultsBox = document.getElementById('mapsResults');
      if (searchBtn && queryInput && resultsBox) {
        function escapeHtmlJs(s) {
          var div = document.createElement('div');
          div.textContent = s || '';
          return div.innerHTML;
        }
        function doSearch() {
          var q = queryInput.value.trim();
          if (!q) return;
          var original = searchBtn.textContent;
          searchBtn.disabled = true;
          searchBtn.textContent = 'Buscando...';
          resultsBox.innerHTML = '';
          fetch('/panel/fidelizacion/buscar-ubicacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q }),
          })
            .then(function (r) {
              return r.json().then(function (data) {
                return { ok: r.ok, data: data };
              });
            })
            .then(function (res) {
              searchBtn.disabled = false;
              searchBtn.textContent = original;
              if (!res.ok || res.data.error) {
                resultsBox.innerHTML =
                  '<p class="muted" style="color:var(--red);">' + escapeHtmlJs(res.data.error || 'No se pudo buscar.') + '</p>';
                return;
              }
              var results = res.data.results || [];
              if (!results.length) {
                resultsBox.innerHTML =
                  '<p class="muted">No encontramos ese negocio en Google Maps. Puedes ingresar las coordenadas a mano abajo.</p>';
                return;
              }
              results.forEach(function (place) {
                var row = document.createElement('button');
                row.type = 'button';
                row.className = 'btn ghost';
                row.style.cssText = 'display:block;width:100%;text-align:left;margin-bottom:6px;';
                row.innerHTML =
                  '<strong>' + escapeHtmlJs(place.name) + '</strong>' +
                  '<div class="muted" style="font-size:12px;">' + escapeHtmlJs(place.address) + '</div>';
                row.addEventListener('click', function () {
                  document.getElementById('f_latitude').value = place.latitude.toFixed(6);
                  document.getElementById('f_longitude').value = place.longitude.toFixed(6);
                  Array.prototype.forEach.call(resultsBox.querySelectorAll('button'), function (b) {
                    b.style.borderColor = '';
                  });
                  row.style.borderColor = 'var(--lime-text)';
                });
                resultsBox.appendChild(row);
              });
            })
            .catch(function () {
              searchBtn.disabled = false;
              searchBtn.textContent = original;
              resultsBox.innerHTML = '<p class="muted" style="color:var(--red);">No se pudo conectar. Intenta de nuevo.</p>';
            });
        }
        searchBtn.addEventListener('click', doSearch);
        queryInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            doSearch();
          }
        });
      }
    })();
    </script>

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
      <div class="card-head"><div><h3>Inscripción a fidelización</h3><div class="sub">Que tus clientes se unan escaneando el QR, sin escribir el enlace</div></div></div>
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px;">
        <div style="background:#fff;padding:10px;border-radius:12px;border:1px solid var(--border);flex-shrink:0;line-height:0;">
          ${qrSvg(joinQrUrl)}
        </div>
        <div style="flex:1;min-width:160px;">
          <a class="btn ghost" href="${qrSvgDataUrl(joinQrUrl)}" download="qr-fidelizacion-${escapeHtml(summary.slug)}.svg" style="display:block;text-align:center;">Descargar QR</a>
        </div>
      </div>
      <label class="muted" style="display:block;font-size:12px;font-weight:700;margin-bottom:6px;">O comparte el enlace directo</label>
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

  if (action === "ubicacion") {
    return handleUbicacion({ formData, env, merchant });
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

// Guarda la ubicación del negocio para el recordatorio de cercanía (ver
// updateLealtadLocation / googleWallet.js). Endpoint separado del de
// "personalizar" -- no depende de los demás campos de la tarjeta.
async function handleUbicacion({ formData, env, merchant }) {
  const latitude = Number(String(formData.get("latitude") || "").trim());
  const longitude = Number(String(formData.get("longitude") || "").trim());
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    const qs = "error=" + encodeURIComponent("Coordenadas inválidas. Usa el botón para tomar tu ubicación actual o revisa los valores.");
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
  }
  const result = await updateLealtadLocation(env, merchant.lealtad_merchant_id, { latitude, longitude });
  const qs = result.ok
    ? "notice=" + encodeURIComponent("Ubicación guardada.")
    : "error=" + encodeURIComponent(result.data?.error || "No se pudo guardar la ubicación.");
  return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion?" + qs } });
}
