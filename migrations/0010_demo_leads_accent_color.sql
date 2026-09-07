-- El wizard de /demo ahora deja elegir un color de marca (antes era fijo
-- según el tipo de negocio). Se guarda para poder mostrarlo en la vista
-- previa y, si el lead se activa, pasarlo a menu_pages.theme_color (ver
-- functions/lib/demoData.js -- convertLeadToMerchant).
ALTER TABLE demo_leads ADD COLUMN accent_color TEXT;
