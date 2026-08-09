-- Líneas extra del bloque de info de la portada (tipo de negocio, frase y
-- año de fundación) — igual que theme_color/logo_url/instagram_url: las
-- configura GoGo directamente en D1, no se editan desde el panel del cliente.
ALTER TABLE menu_pages ADD COLUMN info_title TEXT;
ALTER TABLE menu_pages ADD COLUMN slogan_line TEXT;
ALTER TABLE menu_pages ADD COLUMN founded_year TEXT;
