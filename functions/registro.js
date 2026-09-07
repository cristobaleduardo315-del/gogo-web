import { hashPassword, createSession, sessionCookie } from "./lib/auth.js";
import { renderAuthPage, escapeHtml } from "./lib/layout.js";
import { provisionLealtadMerchant, verifyLealtadCredentials } from "./lib/internalApi.js";
import { getLead, convertLeadToMerchant } from "./lib/demoData.js";

// "demo" es una cuenta de prueba muy limitada (ver functions/lib/planLimits.js):
// a diferencia de start/plus/pro, nunca provisiona una cuenta de fidelización
// en gogo-lealtad (ver onRequestPost más abajo).
const VALID_PLANS = ["start", "plus", "pro", "demo"];

function registerPage({ error, values = {} } = {}) {
  const isDemo = values.plan === "demo";
  const activating = !!values.demo;
  const qsParts = [];
  if (values.plan) qsParts.push(`plan=${encodeURIComponent(values.plan)}`);
  if (values.demo) qsParts.push(`demo=${encodeURIComponent(values.demo)}`);
  const qs = qsParts.length ? `?${qsParts.join("&")}` : "";
  const body = `
    <h1>${isDemo ? "Crea tu cuenta demo" : activating ? "Activa tu negocio en GoGo" : "Crea tu cuenta"}</h1>
    <p class="sub">${
      isDemo
        ? "Prueba el panel de GoGo gratis, sin tarjeta -- con menú digital limitado y sin fidelización."
        : activating
        ? "Crea tu cuenta para publicar el menú que armaste en el demo -- con panel completo y fidelización."
        : "Un solo acceso para tu página, tu plan y tu programa de fidelización."
    }</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST" action="/registro${qs}">
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
function linkExistingPage({ error, businessName, email, password, plan, demo }) {
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
      ${demo ? `<input type="hidden" name="demo" value="${escapeHtml(demo)}">` : ""}
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

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");
  const demo = url.searchParams.get("demo");
  const values = {};
  if (plan) values.plan = plan;
  if (demo) {
    values.demo = demo;
    // Precarga el nombre del negocio (y el correo, si lo dieron) desde el
    // lead del wizard para que "activar" no sea volver a escribir todo.
    const data = await getLead(env.DB, demo);
    if (data && !data.lead.converted_merchant_id) {
      if (data.lead.business_name) values.business_name = data.lead.business_name;
      if (data.lead.email) values.email = data.lead.email;
    }
  }
  return html(registerPage({ values }));
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
  // Id del lead del wizard de /demo, si esta cuenta se está creando para
  // "activar" un demo (ver functions/demo/vista/[id].js). Viaja en la query
  // del primer formulario y como campo oculto en el segundo paso.
  const demoId = String(formData.get("demo") || url.searchParams.get("demo") || "").trim();

  if (!linkExisting) {
    if (!businessName || !email || !password) {
      return html(registerPage({ error: "Completa todos los campos.", values: { business_name: businessName, email, plan, demo: demoId } }), 400);
    }
    if (password.length < 8) {
      return html(
        registerPage({ error: "La contraseña debe tener al menos 8 caracteres.", values: { business_name: businessName, email, plan, demo: demoId } }),
        400
      );
    }
    const existing = await env.DB.prepare("SELECT id FROM web_merchants WHERE email = ?").bind(email).first();
    if (existing) {
      return html(
        registerPage({ error: "Ya existe una cuenta con ese correo. Inicia sesión.", values: { business_name: businessName, email, plan, demo: demoId } }),
        400
      );
    }

    // Cuenta demo (plan=demo, el tier limitado del panel): no se provisiona
    // fidelización en gogo-lealtad (por eso fidelizacion.js la muestra
    // bloqueada con un mensaje para activar un plan), ni se ofrece vincular
    // una cuenta de fidelización existente -- es para negocios nuevos que
    // apenas están probando. No tiene relación con el wizard de /demo.
    if (plan === "demo") {
      return createWebMerchant(env, { businessName, email, password, plan, lealtadMerchantId: null });
    }

    const { ok, status, data } = await provisionLealtadMerchant(env, { businessName, email });
    if (!ok && status === 409) {
      // Ya existe una cuenta de fidelización con este correo: pedir su
      // contraseña para vincularla en vez de crear una duplicada.
      return html(linkExistingPage({ businessName, email, password, plan, demo: demoId }));
    }
    if (!ok) {
      return html(
        registerPage({ error: "No pudimos crear tu cuenta ahora mismo. Intenta de nuevo en un momento.", values: { business_name: businessName, email, plan, demo: demoId } }),
        502
      );
    }
    return createWebMerchant(env, { businessName, email, password, plan, lealtadMerchantId: data.id, demoId });
  }

  // Paso 2: vincular cuenta de fidelización existente.
  const lealtadPassword = String(formData.get("lealtad_password") || "");
  const { ok, data } = await verifyLealtadCredentials(env, { email, password: lealtadPassword });
  if (!ok) {
    return html(linkExistingPage({ error: "Contraseña incorrecta.", businessName, email, password, plan, demo: demoId }));
  }
  return createWebMerchant(env, { businessName, email, password, plan, lealtadMerchantId: data.id, demoId });
}

async function createWebMerchant(env, { businessName, email, password, plan, lealtadMerchantId, demoId }) {
  const id = crypto.randomUUID();
  const { hash, salt } = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO web_merchants (id, email, password_hash, password_salt, business_name, lealtad_merchant_id, plan, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, email, hash, salt, businessName, lealtadMerchantId || null, plan, Date.now())
    .run();

  if (demoId) {
    // Migra las categorías/productos/logo/redes que armó en el wizard de
    // /demo a su cuenta real. Si falla, no bloquea la creación de la
    // cuenta -- el negocio igual puede entrar a su panel y armar el menú
    // de cero.
    try {
      await convertLeadToMerchant(env.DB, demoId, id);
    } catch (err) {
      console.error("convertLeadToMerchant:", err && err.stack ? err.stack : err);
    }
  }

  const token = await createSession(env.DB, id);
  return new Response(null, {
    status: 302,
    headers: { Location: "/panel", "Set-Cookie": sessionCookie(token) },
  });
}
