// Acceso a datos del menú digital gestionable (menu_pages/menu_categories/
// menu_products, ver migrations/0002_menu.sql). Centralizado acá para que
// las rutas del panel (CRUD) y la página pública (/menu/:slug) lean/escriban
// exactamente igual, sin duplicar SQL.

export function formatCOP(pesos) {
  const n = Number(pesos) || 0;
  return "$" + n.toLocaleString("es-CO");
}

export function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes (marcas diacríticas tras NFD)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function getMenuPage(db, merchantId) {
  return db.prepare("SELECT * FROM menu_pages WHERE merchant_id = ?").bind(merchantId).first();
}

export async function getMenuPageBySlug(db, slug) {
  return db.prepare("SELECT * FROM menu_pages WHERE slug = ?").bind(slug).first();
}

export async function isSlugTaken(db, slug, excludingMerchantId) {
  const row = await db
    .prepare("SELECT merchant_id FROM menu_pages WHERE slug = ? AND merchant_id != ?")
    .bind(slug, excludingMerchantId || "")
    .first();
  return !!row;
}

export async function saveMenuPage(db, merchantId, { slug, themeColor, tagline, whatsappPhone, logoUrl }) {
  await db
    .prepare(
      `INSERT INTO menu_pages (merchant_id, slug, theme_color, tagline, whatsapp_phone, logo_url, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(merchant_id) DO UPDATE SET
         slug = excluded.slug,
         theme_color = excluded.theme_color,
         tagline = excluded.tagline,
         whatsapp_phone = excluded.whatsapp_phone,
         logo_url = excluded.logo_url,
         updated_at = excluded.updated_at`
    )
    .bind(merchantId, slug, themeColor, tagline || null, whatsappPhone || null, logoUrl || null, Date.now())
    .run();
}

export async function listCategories(db, merchantId) {
  const { results } = await db
    .prepare("SELECT * FROM menu_categories WHERE merchant_id = ? ORDER BY position ASC, created_at ASC")
    .bind(merchantId)
    .all();
  return results || [];
}

export async function getCategory(db, merchantId, categoryId) {
  return db
    .prepare("SELECT * FROM menu_categories WHERE id = ? AND merchant_id = ?")
    .bind(categoryId, merchantId)
    .first();
}

export async function createCategory(db, merchantId, name) {
  const id = crypto.randomUUID();
  const countRow = await db
    .prepare("SELECT COUNT(*) AS n FROM menu_categories WHERE merchant_id = ?")
    .bind(merchantId)
    .first();
  await db
    .prepare("INSERT INTO menu_categories (id, merchant_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, merchantId, name, countRow ? countRow.n : 0, Date.now())
    .run();
  return id;
}

export async function renameCategory(db, merchantId, categoryId, name) {
  await db
    .prepare("UPDATE menu_categories SET name = ? WHERE id = ? AND merchant_id = ?")
    .bind(name, categoryId, merchantId)
    .run();
}

// Borra la categoría y, en cascada, sus productos (una categoría vacía no
// debería dejar productos huérfanos dando vueltas).
export async function deleteCategory(db, merchantId, categoryId) {
  await db.prepare("DELETE FROM menu_products WHERE category_id = ? AND merchant_id = ?").bind(categoryId, merchantId).run();
  await db.prepare("DELETE FROM menu_categories WHERE id = ? AND merchant_id = ?").bind(categoryId, merchantId).run();
}

export async function listProducts(db, merchantId) {
  const { results } = await db
    .prepare("SELECT * FROM menu_products WHERE merchant_id = ? ORDER BY position ASC, created_at ASC")
    .bind(merchantId)
    .all();
  return results || [];
}

export async function getProduct(db, merchantId, productId) {
  return db
    .prepare("SELECT * FROM menu_products WHERE id = ? AND merchant_id = ?")
    .bind(productId, merchantId)
    .first();
}

export async function createProduct(db, merchantId, { categoryId, name, description, price, imageUrl, isAvailable }) {
  const id = crypto.randomUUID();
  const countRow = await db
    .prepare("SELECT COUNT(*) AS n FROM menu_products WHERE category_id = ?")
    .bind(categoryId)
    .first();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO menu_products (id, merchant_id, category_id, name, description, price, image_url, is_available, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, merchantId, categoryId, name, description || null, price, imageUrl || null, isAvailable ? 1 : 0, countRow ? countRow.n : 0, now, now)
    .run();
  return id;
}

export async function updateProduct(db, merchantId, productId, { categoryId, name, description, price, imageUrl, isAvailable }) {
  await db
    .prepare(
      `UPDATE menu_products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, updated_at = ?
       WHERE id = ? AND merchant_id = ?`
    )
    .bind(categoryId, name, description || null, price, imageUrl || null, isAvailable ? 1 : 0, Date.now(), productId, merchantId)
    .run();
}

export async function deleteProduct(db, merchantId, productId) {
  await db.prepare("DELETE FROM menu_products WHERE id = ? AND merchant_id = ?").bind(productId, merchantId).run();
}

// Todo lo que necesita la página pública en una sola consulta ligera: la
// config del menú + categorías + productos disponibles, ya agrupados.
export async function loadPublicMenu(db, slug) {
  const page = await getMenuPageBySlug(db, slug);
  if (!page) return null;
  const merchant = await db.prepare("SELECT * FROM web_merchants WHERE id = ?").bind(page.merchant_id).first();
  if (!merchant) return null;
  const bizPage = await db.prepare("SELECT * FROM business_page WHERE merchant_id = ?").bind(page.merchant_id).first();
  const categories = await listCategories(db, page.merchant_id);
  const products = await listProducts(db, page.merchant_id);
  const byCategory = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id && p.is_available),
  }));
  return { page, merchant, bizPage, categories: byCategory };
}
