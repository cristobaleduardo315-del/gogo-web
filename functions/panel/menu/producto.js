import { requireMerchant } from "../../lib/auth.js";
import { renderShell } from "../../lib/layout.js";
import { productFormBody } from "../../lib/menuForm.js";
import { listCategories, createProduct } from "../../lib/menuData.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function onRequestGet({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const categories = await listCategories(env.DB, merchant.id);
  if (!categories.length) {
    const qs = "error=" + encodeURIComponent("Crea primero una categoría antes de agregar productos.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }

  const url = new URL(request.url);
  const selectedCategoryId = url.searchParams.get("categoria") || undefined;

  return html(
    renderShell({
      title: "Nuevo producto",
      active: "menu",
      merchant,
      bodyHtml: productFormBody({ categories, selectedCategoryId, isNew: true }),
    })
  );
}

export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const categories = await listCategories(env.DB, merchant.id);
  const formData = await request.formData();
  const categoryId = String(formData.get("category_id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Math.max(0, Math.round(Number(formData.get("price")) || 0));
  const imageUrl = String(formData.get("image_url") || "").trim();
  const isAvailable = formData.get("is_available") === "1";
  const validCategory = categories.some((c) => c.id === categoryId);

  if (!name || !validCategory) {
    return html(
      renderShell({
        title: "Nuevo producto",
        active: "menu",
        merchant,
        bodyHtml: productFormBody({
          categories,
          product: { name, description, price, image_url: imageUrl, category_id: categoryId, is_available: isAvailable ? 1 : 0 },
          isNew: true,
          error: "Completa el nombre y selecciona una categoría válida.",
        }),
      }),
      400
    );
  }

  await createProduct(env.DB, merchant.id, { categoryId, name, description, price, imageUrl, isAvailable });
  const qs = "notice=" + encodeURIComponent("Producto creado.");
  return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
}
