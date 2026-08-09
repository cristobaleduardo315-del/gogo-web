-- Agrega el logo del negocio a la página de menú (mismo patrón que las fotos
-- de producto: se pega una URL de imagen, no se sube un archivo).
ALTER TABLE menu_pages ADD COLUMN logo_url TEXT;
