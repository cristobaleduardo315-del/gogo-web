-- Historial de escaneos del QR del menú público, con fecha (ver
-- functions/menu/[slug]/qr.js). Complementa a qr_scan_count (migración
-- 0007), que solo llevaba un total acumulado sin desglose por día -- este
-- log es lo que permite graficar "cuántos escaneos por día" en el
-- dashboard.
CREATE TABLE qr_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id TEXT NOT NULL REFERENCES web_merchants(id),
  scanned_at INTEGER NOT NULL
);

CREATE INDEX idx_qr_scans_merchant_date ON qr_scans(merchant_id, scanned_at);
