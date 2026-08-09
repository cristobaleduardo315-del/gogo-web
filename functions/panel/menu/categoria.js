import { requireMerchant } from "../../lib/auth.js";
import { createCategory } from "../../lib/menuData.js";

export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    const qs = "error=" + encodeURIComponent("Ponle un nombre a la categoría.");
    return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
  }

  await createCategory(env.DB, merchant.id, name);
  const qs = "notice=" + encodeURIComponent("Categoría creada.");
  return new Response(null, { status: 302, headers: { Location: "/panel/menu?" + qs } });
}
