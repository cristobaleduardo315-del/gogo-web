// POST /demo/crear — recibe el JSON armado por el wizard (functions/demo.js)
// y crea el lead + categorías + productos en D1. Sin autenticación: es la
// puerta de entrada del "demo rápido", pensada para negocios que todavía no
// tienen cuenta. Ver functions/lib/demoData.js.

import { createLead } from "../lib/demoData.js";

const MAX_CATEGORIES = 3;
const MAX_PRODUCTS = 5;
const MAX_IMAGE_LEN = 400000; // ~300KB decoded; el wizard ya redimensiona antes de mandar
const MAX_TEXT_LEN = 500;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function cleanText(v, max = MAX_TEXT_LEN) {
  return String(v || "").trim().slice(0, max);
}

function validImage(v) {
  if (!v) return null;
  const s = String(v);
  if (s.length > MAX_IMAGE_LEN) return null;
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(s)) return null;
  return s;
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Datos inválidos." }, 400);
  }

  const businessType = body.businessType === "tienda" ? "tienda" : "restaurante";
  const businessName = cleanText(body.businessName, 120);
  const whatsappPhone = cleanText(body.whatsappPhone, 30).replace(/[^0-9]/g, "");
  const email = cleanText(body.email, 160);
  const instagramUrl = cleanText(body.instagramUrl, 300);
  const tiktokUrl = cleanText(body.tiktokUrl, 300);
  const logoUrl = validImage(body.logoUrl);

  if (!businessName) return json({ error: "Falta el nombre del negocio." }, 400);
  if (!whatsappPhone && !email) return json({ error: "Danos tu WhatsApp o tu correo." }, 400);

  const rawCategories = Array.isArray(body.categories) ? body.categories : [];
  const categories = rawCategories
    .slice(0, MAX_CATEGORIES)
    .map((c) => ({ name: cleanText(c && c.name, 60) }))
    .filter((c) => c.name);
  if (!categories.length) return json({ error: "Agrega al menos una categoría." }, 400);

  const rawProducts = Array.isArray(body.products) ? body.products : [];
  const products = rawProducts
    .slice(0, MAX_PRODUCTS)
    .map((p) => ({
      name: cleanText(p && p.name, 80),
      price: Math.max(0, Math.round(Number(p && p.price) || 0)),
      description: cleanText(p && p.description, 300),
      imageUrl: validImage(p && p.imageUrl),
      categoryIndex: Math.max(0, Math.min(categories.length - 1, Number(p && p.categoryIndex) || 0)),
    }))
    .filter((p) => p.name);
  if (!products.length) return json({ error: "Agrega al menos un producto." }, 400);

  try {
    const leadId = await createLead(env.DB, {
      businessType,
      businessName,
      whatsappPhone: whatsappPhone || null,
      email: email || null,
      instagramUrl: instagramUrl || null,
      tiktokUrl: tiktokUrl || null,
      logoUrl,
      categories,
      products,
    });
    return json({ id: leadId });
  } catch (err) {
    console.error("POST /demo/crear:", err && err.stack ? err.stack : err);
    return json({ error: "No pudimos guardar tu demo. Intenta de nuevo." }, 500);
  }
}
