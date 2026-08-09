import { requireMerchant } from "../lib/auth.js";
import { renderShell, escapeHtml } from "../lib/layout.js";
import {
  getMenuPage,
  saveMenuPage,
  isSlugTaken,
  listCategories,
  listProducts,
  formatCOP,
  slugify,
} from "../lib/menuData.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function publicMenuUrl(request, slug) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/menu/${slug}`;
}

function pageBody(merchant, { page, categories, products, request, notice, error }) {
  const slug = page ? page.slug : slugify(merchant.business_name) || merchant.id.slice(0, 8);
  const publicUrl = publicMenuUrl(request, slug);

  const catRows = categories
    .map((cat) => {
      const catProducts = products.filter((p) => p.category_id === cat.id);
      const productRows = catProducts
        .map(
          (p) => `<tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                ${
                  p.image_url
                    ? `<img src="${escapeHtml(p.image_url)}" alt="" style="width:34px;height:34px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
                    : `<div style="width:34px;height:34px;border-radius:8px;background:var(--gray-chip);flex-shrink:0;"></div>`
                }
                <div>
                  <strong>${escapeHtml(p.name)}</strong>
                  ${!p.is_available ? '<div style="font-size:11px;color:var(--red);font-weight:700;">Oculto</div>' : ""}
                </div>
              </div>
            </td>
            <td class="muted">${formatCOP(p.price)}</td>
            <td><a class="btn ghost" href="/panel/menu/producto/${p.id}">Editar</a></td>
          </tr>`
        )
        .join("");
      return `
        <div class="card" style="margin-bottom:16px;">
          <div class="card-head">
            <div><h3>${escapeHtml(cat.name)}</h3><div class="sub">${catProducts.length} producto${catProducts.length === 1 ? "" : "s"}</div></div>
            <div style="display:flex;gap:8px;">
              <a class="btn ghost" href="/panel/menu/producto?categoria=${cat.id}">+ Producto</a>
              <details style="position:relative;">
                <summary class="btn ghost" style="list-style:none;cursor:pointer;">⋯</summary>
                <div style="position:absolute;right:0;top:36px;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:10px;box-shadow:var(--shadow);z-index:5;min-width:220px;">
                  <form method="POST" action="/panel/menu/categoria/${cat.id}" style="margin-bottom:8px;">
                    <input type="hidden" name="intent" value="rename">
                    <label style="font-size:11.5px;font-weight:700;color:var(--text-dim);">Renombrar</label>
                    <input name="name" value="${escapeHtml(cat.name)}" style="margin:4px 0 6px;width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;">
                    <button class="btn" type="submit" style="width:100%;">Guardar</button>
                  </form>
                  <form method="POST" action="/panel/menu/categoria/${cat.id}" onsubmit="return confirm('¿Eliminar esta categoría y todos sus productos?');">
                    <input type="hidden" name="intent" value="delete">
                    <button class="btn ghost" type="submit" style="width:100%;color:var(--red);">Eliminar categoría</button>
                  </form>
                </div>
              </details>
            </div>
          </div>
          <table>
            <thead><tr><th>Producto</th><th>Precio</th><th></th></tr></thead>
            <tbody>${productRows || `<tr><td colspan="3" class="muted">Todavía no tienes productos en esta categoría.</td></tr>`}</tbody>
          </table>
        </div>`;
    })
    .join("");

  return `
    <div class="topbar">
      <div><h1>Menú</h1><p>Tu carta digital: la gestionas aquí y se actualiza sola en tu página pública.</p></div>
      <a class="btn ghost" href="${escapeHtml(publicUrl)}" target="_blank" rel="noopener">Ver mi menú público ↗</a>
    </div>

    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}

    <div class="card" style="margin-bottom:16px;max-width:640px;">
      <div class="card-head"><div><h3>Tu página de menú</h3><div class="sub">Diseño propio de tu negocio, sin necesidad de tocar código.</div></div></div>
      <form class="inline" method="POST" action="/panel/menu">
        <input type="hidden" name="form" value="settings">
        <label>Enlace público</label>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="muted" style="font-size:13px;white-space:nowrap;">${escapeHtml(new URL(request.url).host)}/menu/</span>
          <input name="slug" value="${escapeHtml(slug)}" required pattern="[a-z0-9-]+" title="Solo minúsculas, números y guiones" style="flex:1;">
        </div>
        <label>Frase debajo del nombre (opcional)</label>
        <input name="tagline" value="${escapeHtml((page && page.tagline) || "")}" placeholder="Ej. Hamburguesería artesanal desde 2015">
        <label>WhatsApp para domicilios (opcional)</label>
        <input name="whatsapp_phone" value="${escapeHtml((page && page.whatsapp_phone) || "")}" placeholder="Ej. 573001234567">
        <label>Color de tu marca</label>
        <input name="theme_color" type="color" value="${escapeHtml((page && page.theme_color) || "#3d47a0")}" style="height:42px;padding:4px;">
        <label>Logo (URL de una imagen, opcional)</label>
        <input name="logo_url" type="url" value="${escapeHtml((page && page.logo_url) || "")}" placeholder="https://…">
        ${
          page && page.logo_url
            ? `<img src="${escapeHtml(page.logo_url)}" alt="" style="height:44px;margin-top:6px;border-radius:8px;">`
            : ""
        }
        <button class="btn" type="submit" style="margin-top:18px;">Guardar</button>
      </form>
    </div>

    <div class="card" style="margin-bottom:16px;max-width:640px;">
      <div class="card-head"><div><h3>Nueva categoría</h3><div class="sub">Ej. Hamburguesas, Bebidas, Postres…</div></div></div>
      <form class="inline" method="POST" action="/panel/menu/categoria">
        <label>Nombre</label>
        <input name="name" required placeholder="Ej. Hamburguesas">
        <button class="btn" type="submit" style="margin-top:18px;">Agregar categoría</button>
      </form>
    </div>

    ${catRows || `<div class="card"><p class="muted">Todavía no tienes categorías. Crea la primera arriba para empezar a agregar productos.</p></div>`}
  `;
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const url = new URL(request.url);
  const notice = url.searchParams.get("notice") || undefined;
  const error = url.searchParams.get("error") || undefined;

  const [page, categories, products] = await Promise.all([
    getMenuPage(env.DB, merchant.id),
    listCategories(env.DB, merchant.id),
    listProducts(env.DB, merchant.id),
  ]);

  return html(
    renderShell({
      title: "Menú",
      active: "menu",
      merchant,
      bodyHtml: pageBody(merchant, { page, categories, products, request, notice, error }),
    })
  );
}

export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const formData = await request.formData();
  const rawSlug = slugify(String(formData.get("slug") || ""));
  const tagline = String(formData.get("tagline") || "").trim();
  const whatsappPhone = String(formData.get("whatsapp_phone") || "").trim();
  const themeColor = String(formData.get("theme_color") || "#3d47a0").trim();
  const logoUrl = String(formData.get("logo_url") || "").trim();

  if (!rawSlug) {
    const qs = "error=" + encodeURIComponent("El enlace de tu menú no puede quedar vacío.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }
  if (await isSlugTaken(env.DB, rawSlug, merchant.id)) {
    const qs = "error=" + encodeURIComponent("Ese enlace ya lo está usando otro negocio. Prueba con otro.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }

  await saveMenuPage(env.DB, merchant.id, { slug: rawSlug, themeColor, tagline, whatsappPhone, logoUrl });
  const qs = "notice=" + encodeURIComponent("Cambios guardados.");
  return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
}
