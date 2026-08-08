import { getMerchantFromSession, verifyPassword, createSession, sessionCookie, parseCookies } from "./lib/auth.js";
import { renderAuthPage, escapeHtml } from "./lib/layout.js";

function loginPage({ error, values = {} } = {}) {
  const body = `
    <h1>Inicia sesión</h1>
    <p class="sub">Entra a tu dashboard central de GoGo.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST" action="/login">
      <label>Correo</label>
      <input name="email" type="email" required value="${escapeHtml(values.email || "")}">
      <label>Contraseña</label>
      <input name="password" type="password" required>
      <button type="submit">Entrar</button>
    </form>
    <div class="foot">¿No tienes cuenta? <a href="/registro">Crea una</a></div>`;
  return renderAuthPage({ title: "Iniciar sesión", bodyHtml: body });
}

export async function onRequestGet({ request, env }) {
  const cookies = parseCookies(request);
  const merchant = await getMerchantFromSession(env.DB, cookies.web_session);
  if (merchant) {
    return new Response(null, { status: 302, headers: { Location: "/panel" } });
  }
  return new Response(loginPage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const merchant = await env.DB.prepare("SELECT * FROM web_merchants WHERE email = ?").bind(email).first();
  if (!merchant || !(await verifyPassword(password, merchant.password_hash, merchant.password_salt))) {
    return new Response(loginPage({ error: "Correo o contraseña incorrectos.", values: { email } }), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const token = await createSession(env.DB, merchant.id);
  return new Response(null, {
    status: 302,
    headers: { Location: "/panel", "Set-Cookie": sessionCookie(token) },
  });
}
