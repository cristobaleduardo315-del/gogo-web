// Carta pública: índice de categorías + acordeón (una categoría visible a
// la vez) + canasta de compra flotante — port fiel de la carta que ya
// existía en Shopify (theme_export de West Burger, versión con carrito).
// Segunda página del sitio del negocio (la portada vive en /menu/:slug).
// Sin autenticación, lee datos en vivo de D1: cualquier cambio guardado en
// /panel/menu se refleja acá al instante.
import { escapeHtml } from "../../lib/layout.js";
import { loadPublicMenu, formatCOP } from "../../lib/menuData.js";
import {
  FONT_LINKS,
  themeVars,
  rootCss,
  BACK_ICON,
  FOOD_ICON_DEFS,
  categoryIconId,
  jsAttr,
  notFoundPage,
} from "../../lib/menuTheme.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function pageHtml({ page, merchant, categories }) {
  const v = themeVars(page);
  const visibleCats = categories.filter((c) => c.products.length);
  const homeUrl = `/menu/${page.slug}`;
  const waDigits = String(page.whatsapp_phone || "").replace(/[^0-9]/g, "");

  const navLinks = visibleCats
    .map((c) => `<a href="#" onclick="showCat('${c.id}'); return false;">${escapeHtml(c.name)}</a>`)
    .join("");

  const indexButtons = visibleCats
    .map(
      (c) => `<a href="#" onclick="showCat('${c.id}'); return false;"><svg class="wb-icon"><use href="#${categoryIconId(c.name)}"/></svg>${escapeHtml(c.name)}</a>`
    )
    .join("");

  const catSections = visibleCats
    .map((cat) => {
      const iconId = categoryIconId(cat.name);
      const items = cat.products
        .map((p) => {
          const price = Number(p.price) || 0;
          const img = p.image_url
            ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
            : `<svg class="wb-icon"><use href="#${iconId}"/></svg>`;
          return `
        <div class="wb-item">
          <div class="wb-item-img">${img}</div>
          <div class="wb-item-body">
            <p class="wb-item-name">${escapeHtml(p.name)}</p>
            ${p.description ? `<p class="wb-item-desc">${escapeHtml(p.description)}</p>` : ""}
            <div class="wb-buy">
              <span class="wb-buy-price">${formatCOP(price)}</span>
              <button class="wb-buy-btn" onclick="addToCart('${p.id}', ${jsAttr(p.name)}, ${price})"><svg class="wb-icon"><use href="#ic-plus"/></svg>Añadir</button>
            </div>
          </div>
        </div>`;
        })
        .join("");
      return `
    <div class="wb-cat" id="${cat.id}">
      <div class="wb-cat-header"><span class="wb-cat-label">${escapeHtml(cat.name)}</span><div class="wb-cat-line"></div></div>
      <div class="wb-grid">${items}</div>
      <button class="wb-back" onclick="hideCat('${cat.id}')">← Volver al menú</button>
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(merchant.business_name)} — Menú</title>
<meta name="description" content="Menú digital de ${escapeHtml(merchant.business_name)}">
${FONT_LINKS}
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  :root{ ${rootCss(v)} }
  body{font-family:'Sora',sans-serif;}
  .wb-wrap2{background:var(--cream);padding:0 0 88px;font-family:'Sora',sans-serif;position:relative;overflow:hidden;min-height:100vh;}
  .wb-bg{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:0;pointer-events:none;}
  .wb-bg img{position:absolute;opacity:1;width:170px;height:auto;}
  .wb-bg .float1{top:6%;left:3%;animation:floatA 9s ease-in-out infinite;}
  .wb-bg .float2{top:42%;right:4%;animation:floatB 11s ease-in-out infinite;}
  .wb-bg .float3{top:74%;left:5%;animation:floatA 13s ease-in-out infinite;}
  .wb-bg .spin1{top:18%;right:9%;width:200px;animation:spin 40s linear infinite;}
  .wb-bg .spin2{bottom:5%;right:12%;width:150px;animation:spin 55s linear infinite reverse;}
  @keyframes floatA{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(-24px) rotate(6deg);}}
  @keyframes floatB{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(20px) rotate(-6deg);}}
  @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}

  /* ===== Canasta flotante ===== */
  .wb-fab{position:fixed;top:16px;right:16px;z-index:40;width:56px;height:56px;border-radius:50%;background:var(--cream);border:2px solid var(--theme);box-shadow:0 4px 14px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--theme);transition:transform 0.2s;}
  .wb-fab:hover{transform:scale(1.06);}
  .wb-fab .wb-icon{width:26px;height:26px;}
  .wb-fab-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 5px;border-radius:11px;background:var(--theme);color:var(--cream);font-family:'Sora',sans-serif;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;box-sizing:border-box;}

  .wb-navbar{position:fixed;bottom:0;left:0;width:100%;z-index:20;background:var(--theme);padding:10px 0;display:none;box-shadow:0 -3px 14px rgba(0,0,0,0.2);}
  .wb-navbar.show{display:block;}
  .wb-navbar-scroll{display:flex;gap:8px;overflow-x:auto;padding:0 16px;max-width:940px;margin:0 auto;scrollbar-width:none;}
  .wb-navbar-scroll::-webkit-scrollbar{display:none;}
  .wb-navbar-scroll a{flex-shrink:0;font-family:'Sora',sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--theme);background:var(--cream);padding:8px 16px;border-radius:40px;text-decoration:none;white-space:nowrap;transition:background 0.2s,color 0.2s;}
  .wb-navbar-scroll a:hover{background:#ffffff;}
  .wb-inner{max-width:900px;margin:0 auto;padding:20px 20px 0;position:relative;z-index:1;}
  .wb-top-back{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--theme);text-decoration:none;margin-bottom:20px;}
  .wb-back-ic{width:16px;height:16px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;}
  .wb-header{text-align:center;margin-bottom:32px;}
  .wb-eyebrow{display:inline-block;font-family:'Sora',sans-serif;font-size:clamp(10px,2.8vw,12px);letter-spacing:0.18em;text-transform:uppercase;color:var(--theme);border:1px solid color-mix(in srgb, var(--theme) 50%, transparent);padding:7px 18px;border-radius:40px;margin-bottom:12px;background:color-mix(in srgb, var(--cream) 85%, white);}
  .wb-menu-title{font-family:'Sora',sans-serif;font-size:clamp(32px,9vw,48px);font-weight:700;color:var(--theme);margin:0 0 14px;letter-spacing:-0.02em;line-height:1.1;}
  .wb-divider{width:48px;height:2px;background:color-mix(in srgb, var(--theme) 60%, transparent);margin:0 auto 28px;border:none;}
  .wb-index{display:flex;flex-direction:column;align-items:center;gap:11px;}
  .wb-index a{font-family:'Sora',sans-serif;font-size:clamp(12px,3.2vw,14px);font-weight:700;color:var(--cream);text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;padding:14px 24px;border:none;border-radius:40px;background:var(--theme);width:min(300px,90%);text-align:center;transition:background 0.2s,color 0.2s,transform 0.2s;display:flex;align-items:center;justify-content:center;gap:10px;box-sizing:border-box;}
  .wb-index a:hover{background:var(--theme-darker);color:#ffffff;transform:translateY(-2px);}
  .wb-index a svg{width:20px;height:20px;flex-shrink:0;}
  .wb-icon{fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;}
  .wb-cat{display:none;margin-top:36px;}
  .wb-cat.visible{display:block;}
  .wb-cat-header{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
  .wb-cat-label{font-family:'Sora',sans-serif;font-size:clamp(10px,2.8vw,12px);letter-spacing:0.18em;text-transform:uppercase;color:var(--cream);background:var(--theme);padding:8px 20px;border-radius:40px;white-space:nowrap;font-weight:700;}
  .wb-cat-line{flex:1;height:1px;background:color-mix(in srgb, var(--theme) 35%, transparent);}
  .wb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;}
  .wb-item{background:var(--theme);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:transform 0.2s,box-shadow 0.2s;}
  .wb-item:hover{transform:translateY(-4px);box-shadow:0 10px 28px color-mix(in srgb, var(--theme) 35%, transparent);}
  .wb-item-img{width:100%;height:160px;display:flex;align-items:center;justify-content:center;background:var(--theme-dark);color:var(--cream);overflow:hidden;}
  .wb-item-img .wb-icon{width:84px;height:84px;}
  .wb-item-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;position:relative;flex:1;}
  .wb-item-body::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;background:var(--cream);}
  .wb-item-name{font-family:'Sora',sans-serif;font-size:clamp(15px,4vw,17px);font-weight:700;color:var(--cream);line-height:1.2;margin:0;}
  .wb-item-desc{font-family:'Sora',sans-serif;font-size:clamp(11px,3vw,12px);font-weight:700;color:#ffffff;line-height:1.55;margin:0;flex:1;}

  /* ===== Recuadro precio + añadir (crema) ===== */
  .wb-buy{margin-top:12px;background:var(--cream);border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
  .wb-buy-price{font-family:'Sora',sans-serif;font-weight:700;font-size:clamp(15px,4vw,18px);color:var(--theme);}
  .wb-buy-btn{display:inline-flex;align-items:center;gap:6px;background:var(--theme);color:var(--cream);border:none;border-radius:40px;padding:9px 15px;font-family:'Sora',sans-serif;font-weight:700;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;transition:background 0.2s,transform 0.2s;white-space:nowrap;}
  .wb-buy-btn:hover{background:var(--theme-darker);transform:translateY(-2px);}
  .wb-buy-btn .wb-icon{width:15px;height:15px;}

  .wb-back{display:inline-block;margin-top:30px;font-family:'Sora',sans-serif;font-size:clamp(12px,3.2vw,13px);font-weight:700;color:var(--cream);background:var(--theme);padding:13px 28px;border-radius:40px;cursor:pointer;border:none;letter-spacing:0.08em;text-transform:uppercase;transition:background 0.2s;}
  .wb-back:hover{background:var(--theme-darker);color:#ffffff;}
  .wb-empty{padding:60px 20px;text-align:center;color:#8a8272;}

  /* ===== Canasta (sección) ===== */
  .wb-cart-row{display:flex;align-items:center;gap:12px;background:var(--theme);border-radius:12px;padding:12px 14px;margin-bottom:10px;}
  .wb-cart-info{flex:1;min-width:0;}
  .wb-cart-name{color:var(--cream);font-weight:700;margin:0;font-size:clamp(13px,3.5vw,15px);}
  .wb-cart-sub{color:#fff;font-weight:700;margin:2px 0 0;font-size:clamp(12px,3vw,13px);}
  .wb-cart-qty{display:flex;align-items:center;gap:10px;}
  .wb-cart-qty button{width:30px;height:30px;border-radius:50%;border:none;background:var(--cream);color:var(--theme);font-size:18px;font-weight:700;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;}
  .wb-cart-qty span{color:var(--cream);font-weight:700;min-width:16px;text-align:center;}
  .wb-cart-del{background:transparent;border:none;cursor:pointer;color:var(--cream);padding:4px;display:flex;align-items:center;}
  .wb-cart-del .wb-icon{width:20px;height:20px;}
  .wb-cart-empty{color:var(--theme);font-weight:700;text-align:center;padding:30px 0;}
  .wb-cart-total{text-align:right;color:var(--theme);font-weight:700;font-size:clamp(18px,5vw,22px);margin:18px 0 0;}
  .wb-cart-actions{display:flex;flex-direction:column;gap:12px;align-items:center;margin-top:20px;}
  .wb-cart-wa{width:min(360px,100%);background:var(--theme);color:var(--cream);border:none;border-radius:40px;padding:15px 24px;font-family:'Sora',sans-serif;font-weight:700;font-size:clamp(13px,3.5vw,15px);letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:background 0.2s,transform 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;}
  .wb-cart-wa:hover{background:var(--theme-darker);transform:translateY(-2px);}
  .wb-cart-wa .wb-icon{width:18px;height:18px;}

  /* ===== Toast ===== */
  .wb-toast{position:fixed;left:50%;bottom:78px;transform:translateX(-50%) translateY(20px);background:var(--theme);color:var(--cream);padding:12px 22px;border-radius:40px;font-family:'Sora',sans-serif;font-weight:700;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,0.3);opacity:0;pointer-events:none;transition:opacity 0.25s,transform 0.25s;z-index:50;}
  .wb-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

  @media (max-width:640px){
    .wb-inner{padding:16px 16px 0;}
    .wb-grid{grid-template-columns:1fr;gap:14px;}
    .wb-bg img{width:100px;}
    .wb-bg .spin1{width:120px;}
    .wb-bg .spin2{width:90px;}
    .wb-cat-header{gap:10px;}
    .wb-item-img{height:140px;}
    .wb-item-img .wb-icon{width:72px;height:72px;}
  }
</style>
</head>
<body>

${FOOD_ICON_DEFS}

<button class="wb-fab" id="wb-fab" onclick="showCart()" aria-label="Ver canasta">
  <svg class="wb-icon"><use href="#ic-cart"/></svg>
  <span class="wb-fab-badge" id="wb-badge" style="display:none">0</span>
</button>

<div class="wb-navbar" id="wb-navbar">
  <div class="wb-navbar-scroll">${navLinks}</div>
</div>

<div class="wb-wrap2">
  <div class="wb-bg">
    <img class="float1" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-01.webp?v=1784579998" alt="">
    <img class="float2" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-04.webp?v=1784579998" alt="">
    <img class="float3" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-01.webp?v=1784579998" alt="">
    <img class="spin1" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-06.webp?v=1784579998" alt="">
    <img class="spin2" src="https://cdn.shopify.com/s/files/1/0741/4752/8881/files/Sin_ti_utulo-2-06.webp?v=1784579998" alt="">
  </div>

  <div class="wb-inner">
    <a class="wb-top-back" href="${escapeHtml(homeUrl)}">${BACK_ICON}${escapeHtml(merchant.business_name)}</a>

    <div class="wb-header" id="wb-index-section">
      <span class="wb-eyebrow">Nuestras especialidades</span>
      <h3 class="wb-menu-title">Menú</h3>
      <hr class="wb-divider">
      ${
        indexButtons
          ? `<div class="wb-index">${indexButtons}</div>`
          : `<div class="wb-empty">Este negocio todavía está armando su menú. Vuelve pronto.</div>`
      }
    </div>

    ${catSections}

    <div class="wb-cat" id="carrito">
      <div class="wb-cat-header"><span class="wb-cat-label">Tu canasta</span><div class="wb-cat-line"></div></div>
      <div id="wb-cart-items"></div>
      <p id="wb-cart-total" class="wb-cart-total"></p>
      <div id="wb-cart-actions" class="wb-cart-actions" style="display:none">
        ${waDigits ? `<button class="wb-cart-wa" onclick="pedirWhatsApp()"><svg class="wb-icon"><use href="#ic-wa"/></svg>Pedir por WhatsApp</button>` : ""}
        <button class="wb-back" onclick="backToIndex()">← Seguir pidiendo</button>
      </div>
    </div>
  </div>
</div>

<div class="wb-toast" id="wb-toast"></div>

<script>
  var cart = {};
  var BUSINESS_NAME = ${JSON.stringify(merchant.business_name).replace(/<\//g, "<\\/")};
  var WA_DIGITS = ${JSON.stringify(waDigits)};

  function formatPrice(n){ return '$' + n.toLocaleString('es-CO'); }

  function updateBadge(){
    var count = 0;
    Object.keys(cart).forEach(function(id){ count += cart[id].qty; });
    var badge = document.getElementById('wb-badge');
    if(count > 0){ badge.textContent = count; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
  }

  var toastTimer;
  function showToast(msg){
    var t = document.getElementById('wb-toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 1500);
  }

  function addToCart(id, name, price){
    if(cart[id]){ cart[id].qty++; }
    else { cart[id] = { name: name, price: price, qty: 1 }; }
    updateBadge();
    if(document.getElementById('carrito').classList.contains('visible')){ renderCart(); }
    showToast(name + ' añadido');
  }

  function changeQty(id, delta){
    if(!cart[id]) return;
    cart[id].qty += delta;
    if(cart[id].qty <= 0){ delete cart[id]; }
    renderCart();
  }

  function removeItem(id){ delete cart[id]; renderCart(); }

  function renderCart(){
    var cont = document.getElementById('wb-cart-items');
    var ids = Object.keys(cart);
    if(ids.length === 0){
      cont.innerHTML = '<p class="wb-cart-empty">Tu canasta está vacía. Agrega productos desde el menú.</p>';
      document.getElementById('wb-cart-total').textContent = '';
      document.getElementById('wb-cart-actions').style.display = 'none';
      updateBadge();
      return;
    }
    var html = '';
    var total = 0;
    ids.forEach(function(id){
      var it = cart[id];
      var sub = it.price * it.qty;
      total += sub;
      html += '<div class="wb-cart-row">'
        + '<div class="wb-cart-info"><p class="wb-cart-name"></p>'
        + '<p class="wb-cart-sub">' + formatPrice(sub) + '</p></div>'
        + '<div class="wb-cart-qty">'
        + '<button onclick="changeQty(\\'' + id + '\\',-1)">−</button>'
        + '<span>' + it.qty + '</span>'
        + '<button onclick="changeQty(\\'' + id + '\\',1)">+</button>'
        + '</div>'
        + '<button class="wb-cart-del" onclick="removeItem(\\'' + id + '\\')" aria-label="Eliminar"><svg class="wb-icon"><use href="#ic-trash"/></svg></button>'
        + '</div>';
    });
    cont.innerHTML = html;
    // Nombre del producto vía textContent (no interpolado en el HTML) para
    // que un nombre con caracteres especiales nunca rompa el layout.
    var rows = cont.querySelectorAll('.wb-cart-row');
    ids.forEach(function(id, i){ rows[i].querySelector('.wb-cart-name').textContent = cart[id].name; });
    document.getElementById('wb-cart-total').textContent = 'Total: ' + formatPrice(total);
    document.getElementById('wb-cart-actions').style.display = 'flex';
    updateBadge();
  }

  function pedirWhatsApp(){
    var ids = Object.keys(cart);
    if(ids.length === 0 || !WA_DIGITS){ return; }
    var msg = '¡Hola ' + BUSINESS_NAME + '! Quiero hacer este pedido:\\n\\n';
    var total = 0;
    ids.forEach(function(id){
      var it = cart[id];
      var sub = it.price * it.qty;
      total += sub;
      msg += '• ' + it.qty + 'x ' + it.name + ' — ' + formatPrice(sub) + '\\n';
    });
    msg += '\\n*Total: ' + formatPrice(total) + '*';
    var url = 'https://api.whatsapp.com/send?phone=' + WA_DIGITS + '&text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  }

  function showCat(id) {
    document.getElementById('wb-index-section').style.display = 'none';
    document.querySelectorAll('.wb-cat').forEach(function(el) { el.classList.remove('visible'); });
    var target = document.getElementById(id);
    if (!target) return;
    target.classList.add('visible');
    document.getElementById('wb-navbar').classList.add('show');
    window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
  }
  function hideCat(id) {
    var target = document.getElementById(id);
    if (target) target.classList.remove('visible');
    document.getElementById('wb-index-section').style.display = 'block';
    document.getElementById('wb-navbar').classList.remove('show');
    window.scrollTo({ top: document.getElementById('wb-index-section').offsetTop - 20, behavior: 'smooth' });
  }
  function showCart() {
    document.getElementById('wb-index-section').style.display = 'none';
    document.querySelectorAll('.wb-cat').forEach(function(el) { el.classList.remove('visible'); });
    document.getElementById('carrito').classList.add('visible');
    document.getElementById('wb-navbar').classList.add('show');
    renderCart();
    window.scrollTo({ top: document.getElementById('carrito').offsetTop - 60, behavior: 'smooth' });
  }
  function backToIndex() {
    document.querySelectorAll('.wb-cat').forEach(function(el) { el.classList.remove('visible'); });
    document.getElementById('wb-index-section').style.display = 'block';
    document.getElementById('wb-navbar').classList.remove('show');
    window.scrollTo({ top: document.getElementById('wb-index-section').offsetTop - 20, behavior: 'smooth' });
  }
</script>
</body>
</html>`;
}

export async function onRequestGet({ params, env }) {
  const data = await loadPublicMenu(env.DB, String(params.slug || "").toLowerCase());
  if (!data) return notFoundPage(html);
  return html(pageHtml(data));
}
