-- Contador de escaneos del código QR del menú público (uno por negocio,
-- igual de simple que customer_count en gogo-lealtad). Se suma cada vez que
-- alguien entra por /menu/:slug/qr — el enlace que codifica el QR que se
-- muestra en el panel — antes de redirigirlo al menú real.
ALTER TABLE menu_pages ADD COLUMN qr_scan_count INTEGER NOT NULL DEFAULT 0;
