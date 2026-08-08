// Cliente hacia la API interna de gogo-lealtad (/internal/api/*). Todo lo
// relacionado a sellos/clientes/QR vive allá; gogo-web solo lo consulta.
// env.GOGO_LEALTAD_URL y env.INTERNAL_API_SECRET se configuran como
// variables del proyecto Pages (Settings > Environment variables) — el
// secreto debe coincidir con el que se configure en el Worker de
// gogo-lealtad.

async function call(env, path, { method = "GET", body } = {}) {
  const base = env.GOGO_LEALTAD_URL;
  if (!base) throw new Error("Falta configurar GOGO_LEALTAD_URL.");
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": env.INTERNAL_API_SECRET || "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
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

// Pide un token de sesión ya autenticado para mandar al dueño directo al
// panel real de fidelización (SSO) sin pedirle login de nuevo.
export async function getLealtadSsoUrl(env, lealtadMerchantId) {
  const { ok, data } = await call(env, `/internal/api/merchants/${lealtadMerchantId}/sso`, { method: "POST" });
  if (!ok || !data?.token) return null;
  const base = env.GOGO_LEALTAD_URL.replace(/\/$/, "");
  return `${base}/sso/${data.token}`;
}
