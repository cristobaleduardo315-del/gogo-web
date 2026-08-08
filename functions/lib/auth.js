// Utilidades de contraseñas y sesiones del dashboard central de gogo-web.
// Copia adaptada de gogo-lealtad/src/lib/auth.js — mismo patrón probado
// (WebCrypto/PBKDF2, disponible en Cloudflare Pages Functions), pero
// operando sobre web_merchants/web_sessions, una base y un login propios.

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

export function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

export async function hashPassword(password, saltHex) {
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: bufToHex(bits), salt: bufToHex(salt) };
}

export async function verifyPassword(password, hashHex, saltHex) {
  const { hash } = await hashPassword(password, saltHex);
  if (hash.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

export async function createSession(db, merchantId) {
  const token = randomToken(32);
  const now = Date.now();
  await db
    .prepare("INSERT INTO web_sessions (token, merchant_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(token, merchantId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

export async function getMerchantFromSession(db, token) {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT m.* FROM web_sessions s JOIN web_merchants m ON m.id = s.merchant_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .bind(token, Date.now())
    .first();
  return row || null;
}

export async function destroySession(db, token) {
  if (!token) return;
  await db.prepare("DELETE FROM web_sessions WHERE token = ?").bind(token).run();
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  header.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(v.join("="));
  });
  return out;
}

export function sessionCookie(token) {
  return `web_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookie() {
  return `web_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function requireMerchant(request, env) {
  const cookies = parseCookies(request);
  return getMerchantFromSession(env.DB, cookies.web_session);
}
