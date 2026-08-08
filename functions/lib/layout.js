// Shell visual del dashboard central: extraído de panel/index.html (mockup
// aprobado) para que todas las páginas reales del panel (Resumen, Mi página,
// Fidelización, Mi plan, Configuración) compartan el mismo sidebar/topbar en
// vez de reimplementar el diseño en cada ruta.

export function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

const NAV_ITEMS = [
  { key: "resumen", href: "/panel", label: "Resumen", group: "Tu panel" },
  { key: "mi-pagina", href: "/panel/mi-pagina", label: "Mi página", group: "Tu panel" },
  { key: "fidelizacion", href: "/panel/fidelizacion", label: "Fidelización", group: "Tu panel" },
  { key: "mi-plan", href: "/panel/mi-plan", label: "Mi plan", group: "Tu panel" },
  { key: "configuracion", href: "/panel/configuracion", label: "Configuración", group: "Cuenta" },
];

const NAV_ICONS = {
  resumen: `<line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="15"/>`,
  "mi-pagina": `<rect x="3" y="4" width="18" height="12" rx="1.5"/><line x1="8" y1="20" x2="16" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/>`,
  fidelizacion: `<rect x="4" y="9" width="16" height="11" rx="1"/><line x1="4" y1="13" x2="20" y2="13"/><line x1="12" y1="9" x2="12" y2="20"/><path d="M12 9c-1.5 0-3-1-3-2.5S10 4 11 5s1 3 1 4"/><path d="M12 9c1.5 0 3-1 3-2.5S13 4 12 5s-1 3-1 4"/>`,
  "mi-plan": `<rect x="3" y="6" width="18" height="13" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>`,
  configuracion: `<line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="2.1" fill="currentColor"/><line x1="4" y1="14" x2="20" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="14" r="2.1" fill="currentColor"/><line x1="4" y1="19" x2="20" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="11" cy="19" r="2.1" fill="currentColor"/>`,
};

const PLAN_LABELS = { start: "Plan Start", plus: "Plan Plus", pro: "Plan Pro" };

const SHELL_STYLES = `
  :root{
    --lime:#ccff00;
    --lime-dim:rgba(204,255,0,0.18);
    --lime-text:#5c7a00;
    --bg:#f4f4f2;
    --panel:#ffffff;
    --panel-2:#f7f7f4;
    --border:#e6e6e1;
    --text:#0b0b0b;
    --text-dim:#6b6b6b;
    --red:#d9383d;
    --gray-chip:#eeeeea;
    --gray-chip-text:#5c5c58;
    --shadow:0 1px 2px rgba(11,11,11,0.04), 0 1px 12px rgba(11,11,11,0.03);
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background:var(--bg);
    color:var(--text);
    display:flex;
    min-height:100vh;
  }
  .sidebar{
    width:240px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--border);
    padding:28px 20px;display:flex;flex-direction:column;gap:32px;
  }
  .sidebar-logo{height:72px;width:72px;object-fit:contain;display:block;}
  .biz-banner{background:var(--panel-2);border:1px solid var(--border);border-radius:14px;padding:14px;display:flex;align-items:center;gap:10px;}
  .biz-banner .biz-avatar{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#ff9a3d,#ff5c3d);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;color:#fff;}
  .biz-banner .biz-name{font-size:13.5px;font-weight:800;}
  .biz-banner .biz-plan{font-size:11px;color:var(--lime-text);font-weight:700;}
  .nav-group{display:flex;flex-direction:column;gap:4px;}
  .nav-label{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin:14px 0 6px 10px;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;color:var(--text-dim);font-size:14px;font-weight:600;text-decoration:none;cursor:pointer;}
  .nav-icon{width:17px;height:17px;flex-shrink:0;display:inline-flex;}
  .nav-icon svg{width:100%;height:100%;}
  .nav-item.active{background:var(--lime-dim);color:var(--lime-text);}
  .nav-item:not(.active):hover{background:var(--panel-2);color:var(--text);}
  .sidebar-footer{margin-top:auto;padding-top:20px;border-top:1px solid var(--border);font-size:11.5px;color:var(--text-dim);}
  .upgrade-box{background:var(--lime-dim);border:1px solid rgba(204,255,0,0.35);border-radius:14px;padding:14px;margin-top:10px;}
  .upgrade-box .t{font-size:12.5px;font-weight:800;color:var(--lime-text);margin-bottom:4px;}
  .upgrade-box .s{font-size:11.5px;color:#5c6b3d;margin-bottom:10px;}
  .upgrade-btn{display:block;text-align:center;background:var(--lime);color:#000;font-size:12px;font-weight:800;padding:8px;border-radius:20px;text-decoration:none;border:none;width:100%;cursor:pointer;}
  .logout-btn{display:block;width:100%;text-align:left;background:none;border:none;color:var(--text-dim);font-size:12.5px;font-weight:600;cursor:pointer;padding:8px 0 0;}
  .logout-btn:hover{color:var(--text);}

  .main{flex:1;padding:32px 40px;max-width:1400px;}
  .topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;flex-wrap:wrap;gap:16px;}
  .topbar h1{font-size:26px;font-weight:800;letter-spacing:-0.3px;}
  .topbar p{color:var(--text-dim);font-size:14px;margin-top:4px;}

  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
  .kpi-card{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:20px;box-shadow:var(--shadow);}
  .kpi-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
  .kpi-label{font-size:13px;color:var(--text-dim);font-weight:600;}
  .kpi-value{font-size:30px;font-weight:800;letter-spacing:-0.5px;}
  .kpi-delta{font-size:12.5px;font-weight:700;margin-top:6px;display:flex;align-items:center;gap:4px;}

  .row-2{display:grid;grid-template-columns:1.6fr 1fr;gap:16px;margin-bottom:16px;}
  .card{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:22px;box-shadow:var(--shadow);}
  .card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
  .card-head h3{font-size:15px;font-weight:700;}
  .card-head .sub{font-size:12.5px;color:var(--text-dim);margin-top:2px;}

  table{width:100%;border-collapse:collapse;}
  th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-dim);padding:0 12px 12px;font-weight:700;}
  td{padding:13px 12px;font-size:13.5px;border-top:1px solid var(--border);}
  tr:hover td{background:var(--panel-2);}
  .cust-cell{display:flex;align-items:center;gap:10px;}
  .cust-avatar{width:28px;height:28px;border-radius:50%;background:var(--gray-chip);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--lime-text);flex-shrink:0;}
  .muted{color:var(--text-dim);}

  .plan-card{background:linear-gradient(145deg,#f7ffd6,#ffffff);border:1px solid rgba(204,255,0,0.45);}
  .plan-name{font-size:20px;font-weight:800;color:var(--lime-text);margin-bottom:4px;}
  .plan-price{font-size:13px;color:var(--text-dim);margin-bottom:18px;}
  .plan-row{display:flex;justify-content:space-between;font-size:13px;padding:9px 0;border-top:1px solid var(--border);}
  .plan-row:first-of-type{border-top:none;}
  .plan-row .k{color:var(--text-dim);}
  .plan-row .v{font-weight:700;}
  .plan-cta{display:block;text-align:center;margin-top:16px;background:var(--lime);color:#000;font-weight:800;font-size:13px;padding:11px;border-radius:20px;text-decoration:none;border:none;width:100%;cursor:pointer;}
  .plan-cta.ghost{background:var(--panel-2);color:var(--text);border:1px solid var(--border);}

  form.inline label{display:block;font-size:12.5px;font-weight:700;color:var(--text-dim);margin:14px 0 6px;}
  form.inline label:first-of-type{margin-top:0;}
  form.inline input, form.inline textarea, form.inline select{
    width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;background:var(--panel);
  }
  form.inline textarea{resize:vertical;min-height:80px;}
  .btn{display:inline-block;background:var(--lime);color:#000;font-weight:800;font-size:13px;padding:10px 18px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;}
  .btn.ghost{background:var(--panel-2);color:var(--text);border:1px solid var(--border);}
  .notice{background:var(--lime-dim);color:var(--lime-text);border-radius:10px;padding:12px 14px;font-size:13px;font-weight:700;margin-bottom:16px;}
  .error{background:#fdecec;color:var(--red);border-radius:10px;padding:12px 14px;font-size:13px;font-weight:700;margin-bottom:16px;}
  .badge-demo{display:inline-flex;align-items:center;gap:6px;background:var(--lime-dim);color:var(--lime-text);font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;margin-bottom:14px;}

  @media (max-width:1100px){
    .kpi-grid{grid-template-columns:repeat(2,1fr);}
    .row-2{grid-template-columns:1fr;}
    .sidebar{display:none;}
    .main{padding:24px;}
  }
`;

const AUTH_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background:#f4f4f2;color:#0b0b0b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
  }
  .auth-card{background:#fff;border:1px solid #e6e6e1;border-radius:18px;padding:32px;width:100%;max-width:400px;box-shadow:0 1px 2px rgba(11,11,11,0.04), 0 1px 12px rgba(11,11,11,0.03);}
  .auth-card img{height:78px;display:block;margin-bottom:20px;}
  .auth-card h1{font-size:22px;font-weight:800;margin-bottom:6px;letter-spacing:-0.3px;}
  .auth-card p.sub{color:#6b6b6b;font-size:13.5px;margin-bottom:22px;}
  .auth-card label{display:block;font-size:12.5px;font-weight:700;color:#6b6b6b;margin:14px 0 6px;}
  .auth-card label:first-of-type{margin-top:0;}
  .auth-card input{width:100%;padding:11px 12px;border:1px solid #e6e6e1;border-radius:10px;font-size:14px;font-family:inherit;}
  .auth-card button{width:100%;margin-top:20px;background:#ccff00;color:#000;font-weight:800;font-size:14px;padding:12px;border-radius:20px;border:none;cursor:pointer;}
  .auth-card .error{background:#fdecec;color:#d9383d;border-radius:10px;padding:11px 13px;font-size:13px;font-weight:700;margin-bottom:16px;}
  .auth-card .foot{text-align:center;margin-top:18px;font-size:13px;color:#6b6b6b;}
  .auth-card .foot a{color:#5c7a00;font-weight:700;text-decoration:none;}
`;

export function renderAuthPage({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — GoGo</title>
<style>${AUTH_STYLES}</style>
</head>
<body>
  <div class="auth-card">
    <img src="/assets/logo.webp" alt="gogo">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "GG";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export function renderShell({ title, active, merchant, bodyHtml }) {
  const navHtml = NAV_ITEMS.map((item) => {
    const isActive = item.key === active;
    return `<a class="nav-item${isActive ? " active" : ""}" href="${item.href}"><span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${NAV_ICONS[item.key]}</svg></span>${escapeHtml(item.label)}</a>`;
  }).join("");

  const planLabel = PLAN_LABELS[merchant.plan] || PLAN_LABELS.start;
  const showUpgrade = merchant.plan !== "pro";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — GoGo</title>
<style>${SHELL_STYLES}</style>
</head>
<body>
  <aside class="sidebar">
    <img src="/assets/logo.webp" alt="gogo" class="sidebar-logo">
    <div class="biz-banner">
      <div class="biz-avatar">${escapeHtml(initials(merchant.business_name))}</div>
      <div>
        <div class="biz-name">${escapeHtml(merchant.business_name)}</div>
        <div class="biz-plan">${escapeHtml(planLabel)}</div>
      </div>
    </div>
    <nav class="nav-group">
      <div class="nav-label">Tu panel</div>
      ${navHtml}
    </nav>
    <div class="sidebar-footer">
      ${
        showUpgrade
          ? `<div class="upgrade-box">
        <div class="t">Sube de plan</div>
        <div class="s">Desbloquea más funciones para tu negocio.</div>
        <a class="upgrade-btn" href="/panel/mi-plan">Ver planes</a>
      </div>`
          : ""
      }
      <form method="POST" action="/logout">
        <button class="logout-btn" type="submit">Cerrar sesión</button>
      </form>
    </div>
  </aside>
  <main class="main">
    ${bodyHtml}
  </main>
</body>
</html>`;
}
