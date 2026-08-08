-- Base de datos propia del dashboard central de gogo-web. Independiente de
-- gogo-lealtad-db: el dueño del negocio entra siempre por aquí, y los datos
-- de fidelización (sellos, clientes, QR) se piden vía API interna a
-- gogo-lealtad usando lealtad_merchant_id como referencia cruzada.

CREATE TABLE web_merchants (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  business_name TEXT NOT NULL,
  lealtad_merchant_id TEXT,
  plan TEXT NOT NULL DEFAULT 'start',
  created_at INTEGER NOT NULL
);

-- Sesiones del dashboard central (login propio, no reutiliza las sesiones
-- de gogo-lealtad).
CREATE TABLE web_sessions (
  token TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES web_merchants(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Solicitudes de cambio de plan: nunca se cobra ni se activa nada
-- automáticamente, solo queda registrada para seguimiento manual.
CREATE TABLE plan_change_requests (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES web_merchants(id),
  requested_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);

-- Contenido editable de "Mi página" (perfil público del negocio).
CREATE TABLE business_page (
  merchant_id TEXT PRIMARY KEY REFERENCES web_merchants(id),
  headline TEXT,
  description TEXT,
  address TEXT,
  phone TEXT,
  hours_json TEXT,
  updated_at INTEGER NOT NULL
);
