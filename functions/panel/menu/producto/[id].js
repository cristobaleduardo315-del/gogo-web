import { requireMerchant } from "../../../lib/auth.js";
import { renderShell } from "../../../lib/layout.js";
import { productFormBody } from "../../../lib/menuForm.js";
import { listCategories, getProduct, updateProduct, deleteProduct } from "../../../lib/menuData.js";

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function onRequestGet({ request, env, params }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const [categories, product] = await Promise.all([
    listCategories(env.DB, merchant.id),
    getProduct(env.DB, merchant.id, params.id),
  ]);
  if (!product) {
    const qs = "error=" + encodeURIComponent("Ese producto ya no existe.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }

  return html(
    renderShell({
      title: "Editar producto",
      active: "menu",
      merchant,
      bodyHtml: productFormBody({ categories, product, isNew: false }),
    })
  );
}

export async function onRequestPost({ request, env, params }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const product = await getProduct(env.DB, merchant.id, params.id);
  if (!product) {
    const qs = "error=" + encodeURIComponent("Ese producto ya no existe.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }

  const formData = await request.formData();

  if (String(formData.get("intent") || "") === "delete") {
    await deleteProduct(env.DB, merchant.id, product.id);
    const qs = "notice=" + encodeURIComponent("Producto eliminado.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }

  const categories = await listCategories(env.DB, merchant.id);
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
        title: "Editar producto",
        active: "menu",
        merchant,
        bodyHtml: productFormBody({
          categories,
          product: { ...product, name, description, price, image_url: imageUrl, category_id: categoryId, is_available: isAvailable ? 1 : 0 },
          isNew: false,
          error: "Completa el nombre y selecciona una categoría válida.",
        }),
      }),
      400
    );
  }

  await updateProduct(env.DB, merchant.id, product.id, { categoryId, name, description, price, imageUrl, isAvailable });
  const qs = "notice=" + encodeURIComponent("Producto actualizado.");
  return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
}
