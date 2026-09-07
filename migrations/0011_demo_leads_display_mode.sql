-- El wizard de /demo ahora deja elegir cómo se ven los productos en la
-- vista previa: "grid4" (cuadrícula de 4 columnas, el valor por defecto) o
-- "vertical" (lista de arriba a abajo). Se guarda para poder mostrarlo
-- correctamente en renderDemoProducts (ver functions/lib/demoRender.js).
ALTER TABLE demo_leads ADD COLUMN display_mode TEXT DEFAULT 'grid4';
