// Formulario de producto (crear/editar), compartido entre
// panel/menu/producto.js (nuevo) y panel/menu/producto/[id].js (editar) para
// no duplicar el markup.
import { escapeHtml } from "./layout.js";

export function productFormBody({ categories, product, selectedCategoryId, notice, error, isNew }) {
  const p = product || {};
  const catId = selectedCategoryId || p.category_id || (categories[0] && categories[0].id) || "";
  const options = categories
    .map((c) => `<option value="${c.id}"${c.id === catId ? " selected" : ""}>${escapeHtml(c.name)}</option>`)
    .join("");

  return `
    <div class="topbar">
      <div><h1>${isNew ? "Nuevo producto" : "Editar producto"}</h1><p>Así se va a ver en tu menú público.</p></div>
      <a class="btn ghost" href="/panel/menu">← Volver al menú</a>
    </div>
    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ""}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <div class="card" style="max-width:560px;">
      <form class="inline" method="POST">
        <label>Categoría</label>
        <select name="category_id" required>${options}</select>
        <label>Nombre del producto</label>
        <input name="name" required maxlength="60" value="${escapeHtml(p.name || "")}" placeholder="Ej. Hamburguesa Clásica">
        <label>Descripción</label>
        <textarea name="description" maxlength="300" placeholder="Ej. Pan brioche, 125gr de carne de res, queso doble crema…">${escapeHtml(p.description || "")}</textarea>
        <label>Precio (COP, sin puntos ni decimales)</label>
        <input name="price" type="number" min="0" step="1" required value="${p.price != null ? p.price : ""}" placeholder="Ej. 15500">
        <label>Foto (URL de una imagen)</label>
        <input name="image_url" type="url" value="${escapeHtml(p.image_url || "")}" placeholder="https://…">
        <label style="display:flex;align-items:center;gap:8px;margin-top:14px;">
          <input type="checkbox" name="is_available" value="1" ${p.is_available == null || p.is_available ? "checked" : ""} style="width:auto;">
          Visible en el menú público
        </label>
        <button class="btn" type="submit" style="margin-top:18px;">${isNew ? "Crear producto" : "Guardar cambios"}</button>
      </form>
      ${
        isNew
          ? ""
          : `<form method="POST" style="margin-top:12px;" onsubmit="return confirm('¿Eliminar este producto?');">
               <input type="hidden" name="intent" value="delete">
               <button class="btn ghost" type="submit" style="color:var(--red);">Eliminar producto</button>
             </form>`
      }
    </div>`;
}
