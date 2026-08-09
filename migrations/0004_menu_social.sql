-- Enlaces sociales opcionales para la portada del menú (Instagram/TikTok).
-- Igual que theme_color/logo_url: los configura GoGo directamente en D1,
-- no se editan desde el panel del cliente.
ALTER TABLE menu_pages ADD COLUMN instagram_url TEXT;
ALTER TABLE menu_pages ADD COLUMN tiktok_url TEXT;
