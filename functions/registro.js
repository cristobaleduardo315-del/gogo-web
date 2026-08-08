import { hashPassword, createSession, sessionCookie } from "./lib/auth.js";
import { renderAuthPage, escapeHtml } from "./lib/layout.js";
import { provisionLealtadMerchant, verifyLealtadCredentials } from "./lib/internalApi.js";

const VALID_PLANS = ["start", "plus", "pro"];

function registerPage({ error, values = {} } = {}) {
  const body = `
    <h1>Crea tu cuenta</h1>
    <p class="sub">Un solo acceso para tu página, tu plan y tu programa de fidelización.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST" action="/registro${values.plan ? `?plan=${escapeHtml(values.plan)}` : ""}">
      <label>Nombre de tu negocio</label>
      <input name="business_name" required value="${escapeHtml(values.business_name || "")}">
      <label>Correo</label>
      <input name="email" type="email" required value="${escapeHtml(values.email || "")}">
      <label>Contraseña</label>
      <input name="password" type="password" required minlength="8">
      <button type="submit">Crear cuenta</button>
    </form>
    <div class="foot">¿Ya tienes cuenta? <a href="/login">Inicia sesión</a></div>`;
  return renderAuthPage({ title: "Crear cuenta", bodyHtml: body });
}

// Segundo paso: cuando ya existe una cuenta de fidelización con este correo
// (de antes de que existiera el dashboard central), se pide su contraseña
// para vincularla en vez de crear una duplicada.
function linkExistingPage({ error, businessName, email, password, plan }) {
  const body = `
    <h1>Ya tienes un programa de fidelización</h1>
    <p class="sub">Encontramos una cuenta de fidelización con el correo <strong>${escapeHtml(email)}</strong>. Ingresa su contraseña para vincularla a tu cuenta nueva.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST" action="/registro">
      <input type="hidden" name="link_existing" value="1">
      <input type="hidden" name="business_name" value="${escapeHtml(businessName)}">
      <input type="hidden" name="email" value="${escapeHtml(email)}">
      <input type="hidden" name="password" value="${escapeHtml(password)}">
      ${plan ? `<input type="hidden" name="plan" value="${escapeHtml(plan)}">` : ""}
      <label>Contraseña de tu cuenta de fidelización</label>
      <input name="lealtad_password" type="password" required>
      <button type="submit">Vincular y continuar</button>
    </form>
    <div class="foot"><a href="/registro">Usar otro correo</a></div>`;
  return renderAuthPage({ title: "Vincular cuenta", bodyHtml: body });
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");
  return html(registerPage({ values: plan ? { plan } : {} }));
}

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const businessName = String(formData.get("business_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const linkExisting = formData.get("link_existing") === "1";
  const url = new URL(request.url);
  const rawPlan = String(formData.get("plan") || url.searchParams.get("plan") || "start");
  const plan = VALID_PLANS.includes(rawPlan) ? rawPlan : "start";

  if (!linkExisting) {
    if (!businessName || !email || !password) {
      return html(registerPage({ error: "Completa todos los campos.", values: { business_name: businessName, email, plan } }), 400);
    }
    if (password.length < 8) {
      return html(
        registerPage({ error: "La contraseña debe tener al menos 8 caracteres.", values: { business_name: businessName, email, plan } }),
        400
      );
    }
    const existing = await env.DB.prepare("SELECT id FROM web_merchants WHERE email = ?").bind(email).first();
    if (existing) {
      return html(
        registerPage({ error: "Ya existe una cuenta con ese correo. Inicia sesión.", values: { business_name: businessName, email, plan } }),
        400
      );
    }

    const { ok, status, data } = await provisionLealtadMerchant(env, { businessName, email });
    if (!ok && status === 409) {
      // Ya existe una cuenta de fidelización con este correo: pedir su
      // contraseña para vincularla en vez de crear una duplicada.
      return html(linkExistingPage({ businessName, email, password, plan }));
    }
    if (!ok) {
      return html(
        registerPage({ error: "No pudimos crear tu cuenta ahora mismo. Intenta de nuevo en un momento.", values: { business_name: businessName, email, plan } }),
        502
      );
    }
    return createWebMerchant(env, { businessName, email, password, plan, lealtadMerchantId: data.id });
  }

  // Paso 2: vincular cuenta de fidelización existente.
  const lealtadPassword = String(formData.get("lealtad_password") || "");
  const { ok, data } = await verifyLealtadCredentials(env, { email, password: lealtadPassword });
  if (!ok) {
    return html(linkExistingPage({ error: "Contraseña incorrecta.", businessName, email, password, plan }));
  }
  return createWebMerchant(env, { businessName, email, password, plan, lealtadMerchantId: data.id });
}

async function createWebMerchant(env, { businessName, email, password, plan, lealtadMerchantId }) {
  const id = crypto.randomUUID();
  const { hash, salt } = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO web_merchants (id, email, password_hash, password_salt, business_name, lealtad_merchant_id, plan, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, email, hash, salt, businessName, lealtadMerchantId || null, plan, Date.now())
    .run();
  const token = await createSession(env.DB, id);
  return new Response(null, {
    status: 302,
    headers: { Location: "/panel", "Set-Cookie": sessionCookie(token) },
  });
}
