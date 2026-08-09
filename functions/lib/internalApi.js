// Cliente hacia la API interna de gogo-lealtad (/internal/api/*). Todo lo
// relacionado a sellos/clientes/QR vive allá; gogo-web solo lo consulta.
// env.GOGO_LEALTAD_URL y env.INTERNAL_API_SECRET se configuran como
// variables del proyecto Pages (Settings > Environment variables) — el
// secreto debe coincidir con el que se configure en el Worker de
// gogo-lealtad.

async function call(env, path, { method = "GET", body } = {}) {
  const base = env.GOGO_LEALTAD_URL;
  if (!base) throw new Error("Falta configurar GOGO_LEALTAD_URL.");
  // Si gogo-lealtad no responde (timeout, DNS, conexión caída, etc.) fetch()
  // puede lanzar en vez de devolver una Response — antes eso tumbaba toda la
  // función de gogo-web (502 genérico de Cloudflare) en vez de dejar que la
  // página muestre un error legible. Con AbortController evitamos además que
  // una llamada colgada deje la página cargando indefinidamente.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": env.INTERNAL_API_SECRET || "",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    console.error("internalApi call failed:", path, err.message || err);
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timeout);
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// Crea (o detecta duplicado de) la cuenta de fidelización asociada a un
// nuevo registro en gogo-web.
export async function provisionLealtadMerchant(env, { businessName, email }) {
  return call(env, "/internal/api/merchants", {
    method: "POST",
    body: { business_name: businessName, email },
  });
}

// Verifica credenciales de una cuenta de fidelización ya existente, para
// vincularla en vez de crear una duplicada.
export async function verifyLealtadCredentials(env, { email, password }) {
  return call(env, "/internal/api/merchants/verify", {
    method: "POST",
    body: { email, password },
  });
}

export async function getLealtadSummary(env, lealtadMerchantId) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/summary`);
}

export async function getLealtadCustomers(env, lealtadMerchantId) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/customers`);
}

export async function getLealtadConfig(env, lealtadMerchantId) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/config`);
}

export async function updateLealtadConfig(env, lealtadMerchantId, config) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/config`, {
    method: "PUT",
    body: config,
  });
}

// Historial de promociones (notificaciones push) enviadas a las tarjetas de
// Google Wallet guardadas.
export async function getLealtadPromotions(env, lealtadMerchantId) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/promos`);
}

// Envía una promo: Google Wallet la reparte como notificación push a todos
// los dispositivos que tengan guardada una tarjeta de este comercio.
export async function sendLealtadPromotion(env, lealtadMerchantId, { header, body }) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/promos`, {
    method: "POST",
    body: { header, body },
  });
}

// Pide un token de sesión ya autenticado para mandar al dueño directo al
// panel real de fidelización (SSO) sin pedirle login de nuevo.
export async function getLealtadSsoUrl(env, lealtadMerchantId) {
  const { ok, data } = await call(env, `/internal/api/merchants/${lealtadMerchantId}/sso`, { method: "POST" });
  if (!ok || !data?.token) return null;
  const base = env.GOGO_LEALTAD_URL.replace(/\/$/, "");
  return `${base}/sso/${data.token}`;
}

// ---------- Gestión de clientes (escanear QR, ajustar sellos, canjear) ----------
// Con esto el flujo completo de escaneo y gestión de un cliente vive en el
// dashboard central: gogo-web nunca redirige al dueño del negocio a
// gogo-lealtad para nada de esto.

// Busca un cliente por su código (sin sumar sellos todavía) — se usa tanto
// al escanear un QR como al abrir la ficha de un cliente puntual.
export async function lookupLealtadCustomer(env, lealtadMerchantId, code) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/customers/lookup`, {
    method: "POST",
    body: { code },
  });
}

export async function getLealtadCustomer(env, lealtadMerchantId, code) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/customers/${encodeURIComponent(code)}`);
}

// direction: "add" (default) o "remove". source: "scan" (desde la cámara)
// o "manual" (ajuste a mano desde la ficha del cliente) — queda en el
// historial de gogo-lealtad para distinguir uno de otro.
export async function stampLealtadCustomer(env, lealtadMerchantId, { code, quantity, direction, source }) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/customers/stamp`, {
    method: "POST",
    body: { code, quantity, direction, source },
  });
}

export async function redeemLealtadCustomer(env, lealtadMerchantId, code) {
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/customers/redeem`, {
    method: "POST",
    body: { code },
  });
}

// Herramienta temporal de diagnóstico (ver wallet-debug.js en gogo-lealtad).
// Se quita apenas se resuelva el problema puntual que se está investigando.
export async function getWalletDebug(env, lealtadMerchantId, { code, resync = false, classResync = false } = {}) {
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (resync) params.set("resync", "1");
  if (classResync) params.set("classResync", "1");
  const qs = params.toString();
  return call(env, `/internal/api/merchants/${lealtadMerchantId}/wallet-debug${qs ? `?${qs}` : ""}`);
}
