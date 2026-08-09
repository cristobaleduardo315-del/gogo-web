-- Menú digital gestionable: cada negocio puede tener categorías y productos
-- que administra desde su propio panel (/panel/menu), y una página pública
-- con diseño propio del negocio en /menu/:slug que lee siempre los datos
-- más recientes (sin caché ni redeploy).

-- Configuración de la página pública del menú (una fila por negocio).
CREATE TABLE menu_pages (
  merchant_id TEXT PRIMARY KEY REFERENCES web_merchants(id),
  slug TEXT UNIQUE NOT NULL,
  theme_color TEXT NOT NULL DEFAULT '#3d47a0',
  tagline TEXT,
  whatsapp_phone TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE menu_categories (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES web_merchants(id),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE menu_products (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES web_merchants(id),
  category_id TEXT NOT NULL REFERENCES menu_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_menu_categories_merchant ON menu_categories(merchant_id);
CREATE INDEX idx_menu_products_merchant ON menu_products(merchant_id);
CREATE INDEX idx_menu_products_category ON menu_products(category_id);
