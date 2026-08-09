-- Dominio propio opcional para la página pública del menú (ej.
-- www.westburger.com). Igual que theme_color/logo_url: lo configura GoGo
-- directamente en D1 al activar el dominio en Cloudflare Pages, no se
-- edita desde el panel del cliente.
ALTER TABLE menu_pages ADD COLUMN custom_domain TEXT;
CREATE UNIQUE INDEX idx_menu_pages_custom_domain ON menu_pages(custom_domain) WHERE custom_domain IS NOT NULL;
