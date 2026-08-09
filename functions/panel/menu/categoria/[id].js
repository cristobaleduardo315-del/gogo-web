import { requireMerchant } from "../../../lib/auth.js";
import { getCategory, renameCategory, deleteCategory } from "../../../lib/menuData.js";

export async function onRequestPost({ request, env, params }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const category = await getCategory(env.DB, merchant.id, params.id);
  if (!category) {
    const qs = "error=" + encodeURIComponent("Esa categoría ya no existe.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "delete") {
    await deleteCategory(env.DB, merchant.id, category.id);
    const qs = "notice=" + encodeURIComponent("Categoría eliminada.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    const qs = "error=" + encodeURIComponent("Ponle un nombre a la categoría.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }
  await renameCategory(env.DB, merchant.id, category.id, name);
  const qs = "notice=" + encodeURIComponent("Categoría actualizada.");
  return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
}
