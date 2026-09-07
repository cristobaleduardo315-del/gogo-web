-- Demo rápido de menú/catálogo: wizard público (sin login) donde un negocio
-- que todavía no se decide arma en minutos su tipo de negocio, categorías,
-- productos, logo y redes/WhatsApp, y ve una VISTA PREVIA de su home +
-- menú/catálogo -- sin crear cuenta ni tocar el dashboard (ver
-- functions/demo.js y functions/lib/demoData.js). Si decide activarlo de
-- verdad, se registra normal (/registro) y esos datos se migran a las
-- tablas reales (menu_pages/menu_categories/menu_products) -- ver
-- convertLeadToMerchant en demoData.js.
--
-- Tablas separadas de menu_pages/menu_categories/menu_products a propósito:
-- un lead de demo no tiene fila en web_merchants (no hay cuenta, ni
-- password, ni sesión), así que no puede depender de esas foreign keys.

CREATE TABLE demo_leads (
  id TEXT PRIMARY KEY,
  business_type TEXT NOT NULL DEFAULT 'restaurante', -- 'restaurante' | 'tienda'
  business_name TEXT NOT NULL,
  whatsapp_phone TEXT,
  email TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  logo_url TEXT,
  converted_merchant_id TEXT REFERENCES web_merchants(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE demo_lead_categories (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES demo_leads(id),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE demo_lead_products (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES demo_leads(id),
  category_id TEXT NOT NULL REFERENCES demo_lead_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_demo_lead_categories_lead ON demo_lead_categories(lead_id);
CREATE INDEX idx_demo_lead_products_lead ON demo_lead_products(lead_id);
CREATE INDEX idx_demo_lead_products_category ON demo_lead_products(category_id);
