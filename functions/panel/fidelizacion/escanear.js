import { requireMerchant } from "../../lib/auth.js";
import { renderShell } from "../../lib/layout.js";
import { JSQR_SOURCE } from "../../lib/jsqrSource.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Misma lógica de escaneo que tenía gogo-lealtad (cámara + BarcodeDetector
// nativo, con jsQR como respaldo en navegadores que no lo implementan, p.
// ej. Safari/iOS), pero apuntando a las rutas internas de gogo-web
// (/panel/fidelizacion/escanear/buscar y /confirmar) en vez de las de
// gogo-lealtad — así el dueño del negocio nunca sale de este dashboard.
function pageBody() {
  return `
    <div class="topbar">
      <div><h1>Escanear cliente</h1><p>Apunta la cámara al código QR de la tarjeta del cliente.</p></div>
      <a class="btn ghost" href="/panel/fidelizacion">← Volver a Fidelización</a>
    </div>

    <div class="card" style="max-width:480px;">
      <video id="video" autoplay playsinline muted style="width:100%;border-radius:12px;background:#000;"></video>
      <canvas id="canvas" style="display:none;"></canvas>
      <p class="muted" id="status" style="margin-top:12px;">Apunta la cámara al código QR del cliente.</p>
    </div>
    <div id="result" style="max-width:480px;"></div>

    <script>${JSQR_SOURCE}</script>
    <script>
    (function () {
      var scanBusy = false;

      async function startScanner() {
        const video = document.getElementById('video');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        await video.play().catch(() => {});
        if ('BarcodeDetector' in window) {
          startNativeDetector(video);
        } else {
          startJsQrFallback(video);
        }
      }

      function startNativeDetector(video) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
          if (!scanBusy) {
            try {
              const codes = await detector.detect(video);
              if (codes.length > 0) handleCode(codes[0].rawValue);
            } catch (e) {}
          }
          requestAnimationFrame(tick);
        };
        tick();
      }

      function startJsQrFallback(video) {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const tick = () => {
          if (!scanBusy && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = window.jsQRBundle(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
            if (code && code.data) handleCode(code.data);
          }
          requestAnimationFrame(tick);
        };
        tick();
      }

      async function handleCode(rawValue) {
        scanBusy = true;
        const statusEl = document.getElementById('status');
        let code = rawValue;
        try {
          const url = new URL(rawValue);
          const parts = url.pathname.split('/').filter(Boolean);
          code = parts[parts.length - 1];
        } catch (e) {}

        statusEl.textContent = 'Buscando cliente...';
        const res = await fetch('/panel/fidelizacion/escanear/buscar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        const resultEl = document.getElementById('result');

        if (!res.ok) {
          resultEl.innerHTML = '<div class="error">' + (data.error || 'No se pudo buscar el cliente.') + '</div>';
          statusEl.textContent = '';
          setTimeout(() => {
            resultEl.innerHTML = '';
            statusEl.textContent = 'Apunta la cámara al código QR del cliente.';
            scanBusy = false;
          }, 2500);
          return;
        }

        statusEl.textContent = '';
        showConfirmCard(code, data);
      }

      function showConfirmCard(code, data) {
        const resultEl = document.getElementById('result');
        resultEl.innerHTML =
          '<div class="card scan-result" style="text-align:center;">' +
            '<div class="muted">' + data.customerName + '</div>' +
            '<div style="font-size:40px;font-weight:800;margin:8px 0;">' + data.stampCount + '</div>' +
            '<div class="muted">de ' + data.stampsRequired + ' sellos</div>' +
            '<label style="margin-top:16px;display:block;font-size:12.5px;font-weight:700;color:var(--text-dim);">Sellos a sumar</label>' +
            '<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:10px 0;">' +
              '<button type="button" id="qtyMinus" class="btn ghost" style="width:44px;height:44px;padding:0;font-size:20px;">-</button>' +
              '<input type="number" id="qtyInput" min="1" max="50" value="1" style="text-align:center;width:70px;font-size:20px;padding:8px;border:1px solid var(--border);border-radius:10px;">' +
              '<button type="button" id="qtyPlus" class="btn ghost" style="width:44px;height:44px;padding:0;font-size:20px;">+</button>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:8px;">' +
              '<button type="button" id="btnConfirm" class="btn" style="flex:1;">Confirmar</button>' +
              '<button type="button" id="btnCancel" class="btn ghost" style="flex:1;">Cancelar</button>' +
            '</div>' +
          '</div>';

        const qtyInput = document.getElementById('qtyInput');
        document.getElementById('qtyMinus').addEventListener('click', () => {
          qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
        });
        document.getElementById('qtyPlus').addEventListener('click', () => {
          qtyInput.value = Math.min(50, (parseInt(qtyInput.value, 10) || 1) + 1);
        });
        document.getElementById('btnCancel').addEventListener('click', resetScanner);
        document.getElementById('btnConfirm').addEventListener('click', () => {
          const quantity = Math.max(1, Math.min(50, parseInt(qtyInput.value, 10) || 1));
          confirmStamps(code, quantity);
        });
      }

      async function confirmStamps(code, quantity) {
        const resultEl = document.getElementById('result');
        resultEl.innerHTML = '<div class="card scan-result"><div class="muted">Guardando...</div></div>';
        const res = await fetch('/panel/fidelizacion/escanear/confirmar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, quantity }),
        });
        const data = await res.json();
        if (!res.ok) {
          resultEl.innerHTML = '<div class="error">' + (data.error || 'No se pudo guardar.') + '</div>';
        } else {
          resultEl.innerHTML = '<div class="card scan-result" style="text-align:center;">' +
            '<div class="muted">' + data.customerName + '</div>' +
            '<div style="font-size:40px;font-weight:800;margin:8px 0;">' + data.stampCount + '</div>' +
            '<div class="muted">de ' + data.stampsRequired + ' sellos</div>' +
            (data.rewardAvailable ? '<div class="notice" style="margin-top:16px;">¡Meta alcanzada! Puede canjear su recompensa desde su tarjeta.</div>' : '') +
            '</div>';
        }
        setTimeout(resetScanner, 2500);
      }

      function resetScanner() {
        const resultEl = document.getElementById('result');
        const statusEl = document.getElementById('status');
        resultEl.innerHTML = '';
        statusEl.textContent = 'Apunta la cámara al código QR del cliente.';
        scanBusy = false;
      }

      startScanner().catch((e) => {
        document.getElementById('status').textContent = 'No se pudo acceder a la cámara: ' + e.message;
      });
    })();
    </script>`;
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });
  if (!merchant.lealtad_merchant_id) {
    return new Response(null, { status: 302, headers: { Location: "/panel/fidelizacion" } });
  }
  return html(renderShell({ title: "Escanear cliente", active: "fidelizacion", merchant, bodyHtml: pageBody() }));
}
