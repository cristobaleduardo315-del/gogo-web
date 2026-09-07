// Acceso a datos del "demo rápido" (wizard público sin login que arma un
// menú/catálogo de muestra) — ver migrations/0009_demo_leads.sql. Separado
// a propósito de menuData.js: un lead de demo no tiene fila en
// web_merchants (no hay cuenta, contraseña ni sesión).

import { slugify } from "./menuData.js";

// Color de marca por defecto según el tipo de negocio, cuando el lead no
// eligió uno propio en el wizard (paso "Personaliza el color").
export function defaultAccentColor(businessType) {
  return businessType === "tienda" ? "#3d4eac" : "#c2410c";
}

export async function createLead(
  db,
  { businessType, businessName, whatsappPhone, email, instagramUrl, tiktokUrl, logoUrl, accentColor, categories, products }
) {
  const leadId = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO demo_leads (id, business_type, business_name, whatsapp_phone, email, instagram_url, tiktok_url, logo_url, accent_color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      leadId,
      businessType,
      businessName,
      whatsappPhone || null,
      email || null,
      instagramUrl || null,
      tiktokUrl || null,
      logoUrl || null,
      accentColor || null,
      now
    )
    .run();

  // categories: [{ name }], products: [{ name, price, description, imageUrl, categoryIndex }]
  const categoryIds = [];
  for (let i = 0; i < categories.length; i++) {
    const catId = crypto.randomUUID();
    categoryIds.push(catId);
    await db
      .prepare(`INSERT INTO demo_lead_categories (id, lead_id, name, position) VALUES (?, ?, ?, ?)`)
      .bind(catId, leadId, categories[i].name, i)
      .run();
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const catId = categoryIds[p.categoryIndex] || categoryIds[0];
    if (!catId) continue;
    await db
      .prepare(
        `INSERT INTO demo_lead_products (id, lead_id, category_id, name, description, price, image_url, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), leadId, catId, p.name, p.description || null, p.price || 0, p.imageUrl || null, i)
      .run();
  }

  return leadId;
}

export async function getLead(db, leadId) {
  const lead = await db.prepare("SELECT * FROM demo_leads WHERE id = ?").bind(leadId).first();
  if (!lead) return null;
  const { results: categories } = await db
    .prepare("SELECT * FROM demo_lead_categories WHERE lead_id = ? ORDER BY position ASC")
    .bind(leadId)
    .all();
  const { results: products } = await db
    .prepare("SELECT * FROM demo_lead_products WHERE lead_id = ? ORDER BY position ASC")
    .bind(leadId)
    .all();
  return { lead, categories: categories || [], products: products || [] };
}

// Migra un lead de demo a una cuenta real recién creada: arma su
// menu_pages/menu_categories/menu_products a partir de lo que armó en el
// wizard, para que no tenga que volver a cargar nada. Se llama justo
// después de crear el web_merchant en registro.js.
export async function convertLeadToMerchant(db, leadId, merchantId) {
  const data = await getLead(db, leadId);
  if (!data || data.lead.converted_merchant_id) return false;
  const { lead, categories, products } = data;

  let slug = slugify(lead.business_name) || merchantId.slice(0, 8);
  const taken = await db.prepare("SELECT merchant_id FROM menu_pages WHERE slug = ?").bind(slug).first();
  if (taken) slug = `${slug}-${merchantId.slice(0, 4)}`;

  const themeColor = lead.accent_color || defaultAccentColor(lead.business_type);

  await db
    .prepare(
      `INSERT INTO menu_pages (merchant_id, slug, theme_color, tagline, whatsapp_phone, instagram_url, tiktok_url, logo_url, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(merchantId, slug, themeColor, null, lead.whatsapp_phone, lead.instagram_url, lead.tiktok_url, lead.logo_url, Date.now())
    .run();

  const categoryIdMap = {};
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const newId = crypto.randomUUID();
    categoryIdMap[cat.id] = newId;
    await db
      .prepare(`INSERT INTO menu_categories (id, merchant_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(newId, merchantId, cat.name, i, Date.now())
      .run();
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const newCatId = categoryIdMap[p.category_id];
    if (!newCatId) continue;
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO menu_products (id, merchant_id, category_id, name, description, price, image_url, is_available, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .bind(crypto.randomUUID(), merchantId, newCatId, p.name, p.description, p.price, p.image_url, i, now, now)
      .run();
  }

  await db.prepare("UPDATE demo_leads SET converted_merchant_id = ? WHERE id = ?").bind(merchantId, leadId).run();
  return true;
}
