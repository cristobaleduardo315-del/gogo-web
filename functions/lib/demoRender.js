// Demo rápido: wizard público (sin login, sin dashboard) para armar un
// menú/catálogo de muestra en minutos, y sus dos páginas de resultado (home
// + productos). Ver migrations/0009_demo_leads.sql, 0010_demo_leads_accent_color.sql
// y functions/lib/demoData.js.
//
// El wizard es una sola página con JS plano (sin build, mismo criterio que
// el resto del repo): junta todo en un objeto de estado en memoria y solo
// hace UNA petición (POST /demo/crear) al final, para que se sienta rápido
// y no dependa de guardar avances parciales en D1.
//
// El look&feel del wizard (fondo de montañas + card flotante tipo vidrio)
// es deliberadamente el mismo que /login y /registro (ver AUTH_STYLES en
// functions/lib/layout.js) para que se sienta parte de la misma app desde
// el primer paso, aunque todavía no haya cuenta creada.

import { shade } from "./menuTheme.js";

export function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Colores por defecto según tipo de negocio, usados como punto de partida
// del selector de color del wizard (paso "Personaliza el color") -- el
// negocio puede cambiarlo a lo que quiera antes de terminar. Mismos valores
// que functions/lib/demoData.js:defaultAccentColor (se mantienen en los dos
// lados a propósito: uno corre en el navegador, el otro en el servidor).
const DEFAULT_COLORS = { restaurante: "#c2410c", tienda: "#3d4eac" };
const COLOR_PRESETS = ["#c2410c", "#3d4eac", "#0f766e", "#7c3aed", "#be123c", "#111827", "#15803d", "#b45309"];

const ICON_RESTAURANTE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v7a2 2 0 0 0 4 0V2"/><path d="M9 9v13"/><path d="M17 2c-1.6 0-3 1.6-3 4v4h3v11"/></svg>`;
const ICON_TIENDA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`;

const WIZARD_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0;}
  html, body{height:100%;}
  body{
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:#0b0b0b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
    position:relative;background:#0b0b0b;
  }
  /* Si el paso del wizard (ej. varios productos) es más alto que la
     pantalla, el centrado normal de flexbox recorta la parte de arriba y
     la deja inalcanzable con scroll. "safe center" hace que el navegador
     alinee arriba (y deje hacer scroll) en vez de centrar cuando no cabe.
     Se declara aparte para que los navegadores viejos que no soportan
     "safe" simplemente se queden con el "center" de arriba. */
  body{align-items:safe center;}
  .bg-layer{
    position:fixed;inset:0;z-index:0;
    background-image:url('/assets/hero-bg-mountains.webp');
    background-size:cover;background-position:center;background-repeat:no-repeat;
    transform:scale(1.2);transition:transform 0.6s ease-out;
  }
  .bg-overlay{
    position:fixed;inset:0;z-index:1;
    background:linear-gradient(180deg, rgba(11,11,11,0.55) 0%, rgba(11,11,11,0.35) 45%, rgba(11,11,11,0.65) 100%);
  }
  .wz-wrap{position:relative;z-index:2;width:100%;max-width:560px;margin:0 auto;}
  .wz-card{
    padding:32px;border-radius:18px;
    background:rgba(255,255,255,0.55);
    border:1px solid rgba(255,255,255,0.4);
    -webkit-backdrop-filter:blur(24px) saturate(140%);
    backdrop-filter:blur(24px) saturate(140%);
    box-shadow:0 8px 32px rgba(0,0,0,0.35);
  }
  .wz-card img.wz-logo{height:52px;display:block;margin-bottom:18px;}
  .wz-progress{display:flex;gap:6px;margin-bottom:22px;}
  .wz-progress span{flex:1;height:4px;border-radius:2px;background:rgba(11,11,11,0.14);}
  .wz-progress span.done{background:#ccff00;}
  .wz-step{display:none;}
  .wz-step.active{display:block;}
  .wz-step h2{font-size:20px;font-weight:800;margin:0 0 6px;letter-spacing:-0.2px;}
  .wz-step p.sub{color:#3f3f3d;font-size:13.5px;margin:0 0 20px;}
  .wz-field{margin-bottom:16px;}
  .wz-field label{display:block;font-size:12.5px;font-weight:700;color:#3f3f3d;margin-bottom:6px;}
  .wz-field input[type=text],.wz-field input[type=number],.wz-field input[type=tel],.wz-field input[type=email],.wz-field textarea{
    width:100%;padding:11px 12px;border:1px solid rgba(11,11,11,0.14);border-radius:10px;font-size:16px;font-family:inherit;
    background:rgba(255,255,255,0.6);color:#0b0b0b;
  }
  .wz-field input::placeholder,.wz-field textarea::placeholder{color:#6b6b6b;}
  .wz-field textarea{resize:vertical;min-height:64px;}
  .wz-field .hint{font-size:11.5px;color:#3f3f3d;margin-top:5px;}
  .wz-type-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:6px;}
  .wz-type-card{border:2px solid rgba(11,11,11,0.14);border-radius:14px;padding:20px 14px;text-align:center;cursor:pointer;background:rgba(255,255,255,0.5);transition:border-color 0.15s,background 0.15s;}
  .wz-type-card .ic{display:flex;justify-content:center;margin-bottom:8px;color:#0b0b0b;}
  .wz-type-card .ic svg{width:28px;height:28px;}
  .wz-type-card strong{display:block;font-size:14px;}
  .wz-type-card.selected{border-color:#4a6300;background:#ccff00;}
  .wz-product{border:1px solid rgba(11,11,11,0.14);border-radius:12px;padding:14px;margin-bottom:14px;background:rgba(255,255,255,0.45);position:relative;}
  .wz-product .rm{position:absolute;top:10px;right:10px;background:none;border:none;color:#3f3f3d;cursor:pointer;font-size:13px;}
  .wz-field select.pCat{width:100%;padding:11px 12px;border:1px solid rgba(11,11,11,0.14);border-radius:10px;font-size:16px;font-family:inherit;background:rgba(255,255,255,0.6);color:#0b0b0b;}
  .wz-add-product{background:none;border:1px dashed rgba(11,11,11,0.25);border-radius:10px;padding:10px;width:100%;font-size:13px;font-weight:700;color:#3f3f3d;cursor:pointer;}
  .wz-photo-row{display:flex;align-items:center;gap:12px;margin-top:4px;flex-wrap:wrap;}
  .wz-photo-preview{width:52px;height:52px;border-radius:10px;object-fit:cover;background:rgba(11,11,11,0.08);flex-shrink:0;}
  .wz-color-row{display:flex;align-items:center;gap:14px;margin-bottom:16px;}
  .wz-color-row input[type=color]{width:56px;height:44px;border:1px solid rgba(11,11,11,0.14);border-radius:10px;padding:2px;background:rgba(255,255,255,0.6);cursor:pointer;}
  .wz-swatches{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;}
  .wz-swatch{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,0.7);cursor:pointer;box-shadow:0 0 0 1px rgba(11,11,11,0.12);flex-shrink:0;}
  .wz-swatch.selected{box-shadow:0 0 0 2px #0b0b0b;}
  .wz-nav{display:flex;justify-content:space-between;gap:10px;margin-top:22px;}
  .btn{border:none;border-radius:999px;padding:13px 22px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}
  .btn-primary{background:#ccff00;color:#0b0b0b;}
  .btn-primary:disabled{opacity:0.5;cursor:default;}
  .btn-ghost{background:transparent;color:#0b0b0b;}
  .wz-error{background:rgba(253,236,236,0.85);color:#d9383d;border-radius:10px;padding:11px 13px;font-size:13px;font-weight:700;margin-bottom:16px;display:none;}
  .wz-error.show{display:block;}
  .wz-loading{display:none;text-align:center;padding:60px 16px;color:#fff;}
  .wz-loading.show{display:block;}
  .wz-spinner{width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);border-top-color:#ccff00;animation:wzspin 0.8s linear infinite;margin:0 auto 16px;}
  @keyframes wzspin{to{transform:rotate(360deg);}}

  @media (max-width:480px){
    body{padding:14px;}
    .wz-card{padding:22px 18px;border-radius:16px;}
    .wz-card img.wz-logo{height:40px;margin-bottom:14px;}
    .wz-step h2{font-size:18px;}
    .wz-type-card{padding:16px 10px;}
  }
`;

const STEP_TITLES = [
  { title: "¿Qué tipo de negocio tienes?", sub: "Así adaptamos tu página a lo que vendes." },
  { title: "Cuéntanos de tu negocio", sub: "El nombre con el que te conocen tus clientes." },
  { title: "Tus categorías", sub: "Ej. Hamburguesas, Bebidas, Postres… (agrega al menos 1)" },
  { title: "Tus productos", sub: "Agrega hasta 5 — nombre, precio, foto y descripción." },
  { title: "El logo de tu marca", sub: "Opcional, pero se ve mucho mejor con logo." },
  { title: "Personaliza el color", sub: "El color principal de tu página. Puedes cambiarlo cuando quieras." },
  { title: "Redes y contacto", sub: "Para que tus clientes te encuentren, y para avisarte cuando quieras activarlo de verdad." },
];

export function renderDemoWizard() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Prueba GoGo gratis — arma tu menú en minutos</title>
<meta name="description" content="Arma en minutos una vista previa de tu menú o catálogo digital, gratis y sin crear una cuenta.">
<style>${WIZARD_STYLES}</style>
</head>
<body>
  <div class="bg-layer"></div>
  <div class="bg-overlay"></div>
  <div class="wz-wrap">
    <div class="wz-card">
      <img class="wz-logo" src="/assets/logo.webp" alt="gogo">
      <div class="wz-progress" id="wzProgress"></div>
      <div class="wz-error" id="wzError"></div>

      <form id="wzForm">
        <div class="wz-step" data-step="0">
          <h2>${STEP_TITLES[0].title}</h2>
          <p class="sub">${STEP_TITLES[0].sub}</p>
          <div class="wz-type-grid">
            <div class="wz-type-card" data-type="restaurante"><span class="ic">${ICON_RESTAURANTE}</span><strong>Restaurante</strong></div>
            <div class="wz-type-card" data-type="tienda"><span class="ic">${ICON_TIENDA}</span><strong>Tienda online</strong></div>
          </div>
        </div>

        <div class="wz-step" data-step="1">
          <h2>${STEP_TITLES[1].title}</h2>
          <p class="sub">${STEP_TITLES[1].sub}</p>
          <div class="wz-field">
            <label>Nombre de tu negocio</label>
            <input type="text" id="fBusinessName" placeholder="Ej. Donde Cris Burgers" required>
          </div>
        </div>

        <div class="wz-step" data-step="2">
          <h2>${STEP_TITLES[2].title}</h2>
          <p class="sub" id="catSub">${STEP_TITLES[2].sub}</p>
          <div class="wz-field"><label>Categoría 1</label><input type="text" class="fCat" placeholder="Ej. Hamburguesas" required></div>
          <div class="wz-field"><label>Categoría 2 (opcional)</label><input type="text" class="fCat" placeholder="Ej. Bebidas"></div>
          <div class="wz-field"><label>Categoría 3 (opcional)</label><input type="text" class="fCat" placeholder="Ej. Postres"></div>
        </div>

        <div class="wz-step" data-step="3">
          <h2>${STEP_TITLES[3].title}</h2>
          <p class="sub">${STEP_TITLES[3].sub}</p>
          <div id="wzProducts"></div>
          <button type="button" class="wz-add-product" id="wzAddProduct">+ Agregar otro producto</button>
        </div>

        <div class="wz-step" data-step="4">
          <h2>${STEP_TITLES[4].title}</h2>
          <p class="sub">${STEP_TITLES[4].sub}</p>
          <div class="wz-field">
            <label>Logo (PNG o JPG)</label>
            <div class="wz-photo-row">
              <img class="wz-photo-preview" id="logoPreview" alt="">
              <input type="file" accept="image/png,image/jpeg,image/webp" id="fLogo">
            </div>
          </div>
        </div>

        <div class="wz-step" data-step="5">
          <h2>${STEP_TITLES[5].title}</h2>
          <p class="sub">${STEP_TITLES[5].sub}</p>
          <div class="wz-swatches" id="wzSwatches">
            ${COLOR_PRESETS.map((c) => `<span class="wz-swatch" data-color="${c}" style="background:${c}"></span>`).join("")}
          </div>
          <div class="wz-color-row">
            <input type="color" id="fColor" value="${DEFAULT_COLORS.restaurante}">
            <div class="hint">O elige el tuyo con el selector</div>
          </div>
        </div>

        <div class="wz-step" data-step="6">
          <h2>${STEP_TITLES[6].title}</h2>
          <p class="sub">${STEP_TITLES[6].sub}</p>
          <div class="wz-field"><label>WhatsApp (con indicativo, ej. 57...)</label><input type="tel" id="fWhatsapp" placeholder="573001234567"></div>
          <div class="wz-field"><label>Correo (opcional si ya diste tu WhatsApp)</label><input type="email" id="fEmail" placeholder="tucorreo@ejemplo.com"></div>
          <div class="wz-field"><label>Instagram (opcional)</label><input type="text" id="fInstagram" placeholder="@tunegocio"></div>
          <div class="wz-field"><label>TikTok (opcional)</label><input type="text" id="fTiktok" placeholder="@tunegocio"></div>
          <div class="wz-field hint">Necesitamos al menos tu WhatsApp o tu correo para poder avisarte cuando actives tu página de verdad.</div>
        </div>
      </form>

      <div class="wz-nav" id="wzNav">
        <button type="button" class="btn btn-ghost" id="wzBack">Atrás</button>
        <button type="button" class="btn btn-primary" id="wzNext">Siguiente</button>
      </div>
    </div>

    <div class="wz-loading" id="wzLoading">
      <div class="wz-spinner"></div>
      <p>Armando tu vista previa…</p>
    </div>
  </div>

<script>
(function () {
  var TOTAL_STEPS = 7;
  var MAX_PRODUCTS = 5;
  var current = 0;
  var state = { businessType: '', products: [], logoDataUrl: '' };
  var colorTouched = false;
  var DEFAULT_COLORS = ${JSON.stringify(DEFAULT_COLORS)};

  var form = document.getElementById('wzForm');
  var steps = Array.prototype.slice.call(form.querySelectorAll('.wz-step'));
  var progressEl = document.getElementById('wzProgress');
  var errorEl = document.getElementById('wzError');
  var backBtn = document.getElementById('wzBack');
  var nextBtn = document.getElementById('wzNext');
  var loadingEl = document.getElementById('wzLoading');
  var cardEl = document.querySelector('.wz-card');
  var colorInput = document.getElementById('fColor');

  for (var i = 0; i < TOTAL_STEPS; i++) {
    var dot = document.createElement('span');
    progressEl.appendChild(dot);
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('show');
  }
  function clearError() {
    errorEl.classList.remove('show');
  }

  function renderStep() {
    steps.forEach(function (s) { s.classList.toggle('active', Number(s.dataset.step) === current); });
    Array.prototype.forEach.call(progressEl.children, function (dot, idx) {
      dot.classList.toggle('done', idx <= current);
    });
    backBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = current === TOTAL_STEPS - 1 ? 'Ver mi vista previa' : 'Siguiente';
    clearError();
  }

  document.querySelectorAll('.wz-type-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.wz-type-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      state.businessType = card.dataset.type;
      var catSub = document.getElementById('catSub');
      catSub.textContent = state.businessType === 'tienda'
        ? 'Ej. Ropa, Accesorios, Ofertas… (agrega al menos 1)'
        : 'Ej. Hamburguesas, Bebidas, Postres… (agrega al menos 1)';
      if (!colorTouched) {
        setColor(DEFAULT_COLORS[state.businessType] || DEFAULT_COLORS.restaurante);
      }
    });
  });

  // ---- Color de marca ----
  function setColor(hex) {
    colorInput.value = hex;
    document.querySelectorAll('.wz-swatch').forEach(function (sw) {
      sw.classList.toggle('selected', sw.dataset.color.toLowerCase() === hex.toLowerCase());
    });
  }
  document.querySelectorAll('.wz-swatch').forEach(function (sw) {
    sw.addEventListener('click', function () {
      colorTouched = true;
      setColor(sw.dataset.color);
    });
  });
  colorInput.addEventListener('input', function () {
    colorTouched = true;
    setColor(colorInput.value);
  });

  // ---- Productos dinámicos ----
  var productsWrap = document.getElementById('wzProducts');
  var addProductBtn = document.getElementById('wzAddProduct');

  function categoryOptionsHtml() {
    var cats = Array.prototype.map.call(form.querySelectorAll('.fCat'), function (i) { return i.value.trim(); });
    var opts = '';
    cats.forEach(function (name, idx) {
      if (name) opts += '<option value="' + idx + '">' + name.replace(/</g, '&lt;') + '</option>';
    });
    return opts || '<option value="0">Categoría 1</option>';
  }

  function addProductBlock() {
    var blocks = productsWrap.querySelectorAll('.wz-product');
    if (blocks.length >= MAX_PRODUCTS) return;
    var idx = blocks.length;
    var div = document.createElement('div');
    div.className = 'wz-product';
    div.innerHTML =
      (idx > 0 ? '<button type="button" class="rm">Quitar</button>' : '') +
      '<div class="wz-field"><label>Categoría</label><select class="pCat">' + categoryOptionsHtml() + '</select></div>' +
      '<div class="wz-field"><label>Nombre del producto</label><input type="text" class="pName" placeholder="Ej. Hamburguesa Clásica"' + (idx === 0 ? ' required' : '') + '></div>' +
      '<div class="wz-field"><label>Precio (COP)</label><input type="number" class="pPrice" min="0" placeholder="Ej. 18000"' + (idx === 0 ? ' required' : '') + '></div>' +
      '<div class="wz-field"><label>Descripción (opcional)</label><textarea class="pDesc" placeholder="Ej. Pan brioche, carne 150g, queso, salsa especial"></textarea></div>' +
      '<div class="wz-field"><label>Foto (opcional)</label><div class="wz-photo-row"><img class="wz-photo-preview pPhotoPreview" alt=""><input type="file" class="pPhoto" accept="image/png,image/jpeg,image/webp"></div></div>';
    productsWrap.appendChild(div);
    if (idx > 0) {
      div.querySelector('.rm').addEventListener('click', function () { div.remove(); });
    }
    div.querySelector('.pPhoto').addEventListener('change', function (e) {
      handlePhoto(e.target, div.querySelector('.pPhotoPreview'));
    });
    if (addProductBtn) addProductBtn.style.display = productsWrap.querySelectorAll('.wz-product').length >= MAX_PRODUCTS ? 'none' : 'block';
  }
  addProductBlock();
  addProductBlock();
  addProductBlock();
  addProductBtn.addEventListener('click', addProductBlock);

  function refreshCategorySelects() {
    var html = categoryOptionsHtml();
    productsWrap.querySelectorAll('.pCat').forEach(function (sel) {
      var prev = sel.value;
      sel.innerHTML = html;
      if (prev) sel.value = prev;
    });
  }
  form.querySelectorAll('.fCat').forEach(function (input) {
    input.addEventListener('input', refreshCategorySelects);
  });

  // ---- Imágenes: redimensionar en el navegador antes de mandar ----
  function resizeImage(file, maxWidth, quality, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxWidth / img.width);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handlePhoto(input, previewImg) {
    var file = input.files && input.files[0];
    if (!file) return;
    resizeImage(file, 700, 0.72, function (dataUrl) {
      previewImg.src = dataUrl;
      input.dataset.dataUrl = dataUrl;
    });
  }

  document.getElementById('fLogo').addEventListener('change', function (e) {
    handlePhoto(e.target, document.getElementById('logoPreview'));
  });

  // ---- Validación y avance ----
  function validateStep() {
    if (current === 0) {
      if (!state.businessType) { showError('Elige un tipo de negocio para continuar.'); return false; }
    }
    if (current === 1) {
      var name = document.getElementById('fBusinessName').value.trim();
      if (!name) { showError('Escribe el nombre de tu negocio.'); return false; }
    }
    if (current === 2) {
      var cats = form.querySelectorAll('.fCat');
      if (!cats[0].value.trim()) { showError('Agrega al menos una categoría.'); return false; }
      refreshCategorySelects();
    }
    if (current === 3) {
      var blocks = productsWrap.querySelectorAll('.wz-product');
      var first = blocks[0];
      if (!first.querySelector('.pName').value.trim() || !first.querySelector('.pPrice').value) {
        showError('Agrega al menos un producto con nombre y precio.');
        return false;
      }
    }
    if (current === 6) {
      var wa = document.getElementById('fWhatsapp').value.trim();
      var email = document.getElementById('fEmail').value.trim();
      if (!wa && !email) { showError('Danos tu WhatsApp o tu correo para poder contactarte.'); return false; }
    }
    return true;
  }

  function collectPayload() {
    var categories = Array.prototype.map.call(form.querySelectorAll('.fCat'), function (i) { return i.value.trim(); })
      .filter(Boolean)
      .map(function (name) { return { name: name }; });

    var products = [];
    productsWrap.querySelectorAll('.wz-product').forEach(function (block) {
      var name = block.querySelector('.pName').value.trim();
      if (!name) return;
      products.push({
        name: name,
        price: Number(block.querySelector('.pPrice').value) || 0,
        description: block.querySelector('.pDesc').value.trim(),
        imageUrl: block.querySelector('.pPhoto').dataset.dataUrl || '',
        categoryIndex: Number(block.querySelector('.pCat').value) || 0,
      });
    });

    return {
      businessType: state.businessType,
      businessName: document.getElementById('fBusinessName').value.trim(),
      categories: categories,
      products: products,
      logoUrl: document.getElementById('fLogo').dataset.dataUrl || '',
      accentColor: colorInput.value,
      whatsappPhone: document.getElementById('fWhatsapp').value.trim(),
      email: document.getElementById('fEmail').value.trim(),
      instagramHandle: document.getElementById('fInstagram').value.trim(),
      tiktokHandle: document.getElementById('fTiktok').value.trim(),
    };
  }

  function submitWizard() {
    cardEl.style.display = 'none';
    loadingEl.classList.add('show');
    fetch('/demo/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectPayload()),
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok || !res.data.id) throw new Error(res.data && res.data.error);
        window.location.href = '/demo/vista/' + res.data.id;
      })
      .catch(function () {
        cardEl.style.display = '';
        loadingEl.classList.remove('show');
        showError('No pudimos armar tu vista previa. Intenta de nuevo.');
      });
  }

  nextBtn.addEventListener('click', function () {
    if (!validateStep()) return;
    if (current === TOTAL_STEPS - 1) { submitWizard(); return; }
    current++;
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  backBtn.addEventListener('click', function () {
    if (current === 0) return;
    current--;
    renderStep();
  });

  renderStep();

  // Parallax/zoom del fondo de montañas siguiendo el cursor -- mismo
  // mecanismo que /login y /registro (ver AUTH_STYLES en functions/lib/layout.js).
  var bg = document.querySelector('.bg-layer');
  if (bg && window.matchMedia("(hover: hover)").matches) {
    var clamp = function (value, min, max) { return Math.max(min, Math.min(max, value)); };
    document.addEventListener('mousemove', function (e) {
      var cx = window.innerWidth / 2;
      var cy = window.innerHeight / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var translateX = clamp(dx * 0.05, -48, 48);
      var translateY = clamp(dy * 0.05, -40, 40);
      bg.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(1.2)';
    });
    document.addEventListener('mouseleave', function () {
      bg.style.transform = 'translate(0px, 0px) scale(1.2)';
    });
  }
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------
// Home + página de productos del resultado (functions/demo/vista/[id].js
// y functions/demo/vista/[id]/productos.js)
// ---------------------------------------------------------------------

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet">`;

const BUSINESS_LABELS = {
  restaurante: { verb: "Ver menú", typeLabel: "Restaurante" },
  tienda: { verb: "Ver catálogo", typeLabel: "Tienda online" },
};

const CREAM = "#f6f4f0";

function demoThemeVars(accentColor) {
  const theme = accentColor || "#3d4eac";
  return { theme, themeDark: shade(theme, 0.78), themeDarker: shade(theme, 0.68), cream: CREAM };
}

function waLink(phone) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent("Hola, quiero hacer un pedido")}`;
}

function formatCOP(pesos) {
  const n = Number(pesos) || 0;
  return "$" + n.toLocaleString("es-CO");
}

function previewBanner(activateUrl) {
  return `<div class="dp-banner">
    <span>Esta es una <strong>vista previa</strong> — todavía no es tu página real.</span>
    <a href="${escapeHtml(activateUrl)}">Activar mi negocio en GoGo</a>
  </div>`;
}

function bannerStyles(v) {
  return `
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{background:${v.cream};}
  body{font-family:'Sora',sans-serif;color:#141414;padding-bottom:60px;}
  .dp-banner{position:sticky;top:0;z-index:50;background:#0b0b0b;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;text-align:center;font-size:13px;}
  .dp-banner strong{color:#ccff00;}
  .dp-banner a{background:#ccff00;color:#0b0b0b;text-decoration:none;font-weight:700;padding:8px 16px;border-radius:999px;font-size:12.5px;white-space:nowrap;}
  footer{max-width:760px;margin:20px auto 0;padding:0 18px;text-align:center;color:#999;font-size:12px;}
  footer a{color:${v.themeDark};}
  @media (max-width:480px){
    .dp-banner{font-size:12px;padding:10px 14px;gap:10px;}
    .dp-banner a{padding:7px 13px;}
  }`;
}

// Home: logo, nombre, botón "Ver menú"/"Ver catálogo" (lleva a la página de
// productos, NO ancla dentro de la misma página), botón de WhatsApp, botón
// de redes. Sin productos acá -- Cristobal pidió que sea una página aparte.
export function renderDemoHome({ lead, categories, products }, { activateUrl, productsUrl }) {
  const label = BUSINESS_LABELS[lead.business_type] || BUSINESS_LABELS.restaurante;
  const v = demoThemeVars(lead.accent_color);
  const wa = waLink(lead.whatsapp_phone);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${escapeHtml(lead.business_name)} — Vista previa GoGo</title>
${FONT_LINKS}
<style>
${bannerStyles(v)}
  .dp-hero{min-height:calc(100vh - 46px);display:flex;flex-direction:column;align-items:center;justify-content:center;background:${v.theme};color:#fff;padding:44px 20px;text-align:center;}
  .dp-hero img.logo{width:min(180px,60%);height:auto;margin:0 auto 16px;display:block;border-radius:16px;}
  .dp-hero h1{font-size:clamp(22px,6vw,32px);margin-bottom:6px;}
  .dp-hero .type{font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;margin-bottom:28px;}
  .dp-cta-list{display:flex;flex-direction:column;gap:10px;max-width:360px;width:100%;margin:0 auto;}
  .dp-cta{display:block;padding:14px 18px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;text-align:center;transition:transform 0.15s;}
  .dp-cta:hover{transform:translateY(-2px);}
  .dp-cta-main{background:#fff;color:${v.theme};}
  .dp-cta-alt{background:transparent;color:#fff;border:2px solid rgba(255,255,255,0.7);}
  @media (max-width:480px){
    .dp-hero{padding:32px 18px;}
    .dp-hero img.logo{margin-bottom:12px;}
    .dp-hero .type{margin-bottom:20px;}
  }
</style>
</head>
<body>
  ${previewBanner(activateUrl)}
  <div class="dp-hero">
    ${lead.logo_url ? `<img class="logo" src="${escapeHtml(lead.logo_url)}" alt="${escapeHtml(lead.business_name)}">` : ""}
    <h1>${escapeHtml(lead.business_name)}</h1>
    <div class="type">${escapeHtml(label.typeLabel)}</div>
    <div class="dp-cta-list">
      <a class="dp-cta dp-cta-main" href="${escapeHtml(productsUrl)}">${escapeHtml(label.verb)}</a>
      ${wa ? `<a class="dp-cta dp-cta-alt" href="${wa}" target="_blank" rel="noopener">Pedir por WhatsApp</a>` : ""}
      ${lead.instagram_url ? `<a class="dp-cta dp-cta-alt" href="${escapeHtml(lead.instagram_url)}" target="_blank" rel="noopener">Instagram</a>` : ""}
      ${lead.tiktok_url ? `<a class="dp-cta dp-cta-alt" href="${escapeHtml(lead.tiktok_url)}" target="_blank" rel="noopener">TikTok</a>` : ""}
    </div>
  </div>
</body>
</html>`;
}

// Página de productos: se abre al tocar "Ver menú"/"Ver catálogo" en el
// home. Agrupados por categoría, con un link para volver al home.
export function renderDemoProducts({ lead, categories, products }, { activateUrl, backUrl }) {
  const label = BUSINESS_LABELS[lead.business_type] || BUSINESS_LABELS.restaurante;
  const v = demoThemeVars(lead.accent_color);
  const byCategory = categories.map((cat) => ({
    ...cat,
    items: products.filter((p) => p.category_id === cat.id),
  }));

  const productsHtml = byCategory
    .filter((c) => c.items.length)
    .map(
      (cat) => `
      <div class="dp-cat">
        <h3>${escapeHtml(cat.name)}</h3>
        <div class="dp-grid">
          ${cat.items
            .map(
              (p) => `
            <div class="dp-item">
              ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">` : `<div class="dp-noimg"></div>`}
              <div class="dp-item-body">
                <div class="dp-item-top"><strong>${escapeHtml(p.name)}</strong><span>${formatCOP(p.price)}</span></div>
                ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ""}
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${escapeHtml(lead.business_name)} — ${escapeHtml(label.verb)}</title>
${FONT_LINKS}
<style>
${bannerStyles(v)}
  .dp-top{max-width:760px;margin:0 auto;padding:22px 18px 0;display:flex;align-items:center;gap:10px;}
  .dp-back{color:${v.themeDark};text-decoration:none;font-weight:700;font-size:13.5px;display:inline-flex;align-items:center;gap:6px;}
  .dp-back svg{width:16px;height:16px;}
  .dp-title{max-width:760px;margin:10px auto 0;padding:0 18px;}
  .dp-title h1{font-size:clamp(20px,5vw,26px);color:${v.themeDark};}
  .dp-body{max-width:760px;margin:0 auto;padding:22px 18px 0;}
  .dp-cat{margin-bottom:32px;}
  .dp-cat h3{font-size:18px;margin-bottom:14px;color:${v.themeDark};}
  .dp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;}
  .dp-item{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);}
  .dp-item img,.dp-noimg{width:100%;height:140px;object-fit:cover;background:${v.cream};display:block;}
  .dp-item-body{padding:12px 14px;}
  .dp-item-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:4px;}
  .dp-item-top strong{font-size:14px;}
  .dp-item-top span{font-size:13px;font-weight:700;color:${v.themeDark};white-space:nowrap;}
  .dp-item p{font-size:12.5px;color:#666;line-height:1.4;}
  @media (max-width:480px){
    .dp-grid{grid-template-columns:1fr 1fr;gap:10px;}
    .dp-item img,.dp-noimg{height:110px;}
  }
  @media (max-width:360px){
    .dp-grid{grid-template-columns:1fr;}
  }
</style>
</head>
<body>
  ${previewBanner(activateUrl)}
  <div class="dp-top">
    <a class="dp-back" href="${escapeHtml(backUrl)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>${escapeHtml(lead.business_name)}</a>
  </div>
  <div class="dp-title"><h1>${escapeHtml(label.verb)}</h1></div>
  <div class="dp-body">
    ${productsHtml || `<p style="text-align:center;color:#999;">Todavía no agregaste productos.</p>`}
  </div>
  <footer>Vista previa hecha con <a href="https://soygogo.com" target="_blank" rel="noopener">GoGo</a></footer>
</body>
</html>`;
}
