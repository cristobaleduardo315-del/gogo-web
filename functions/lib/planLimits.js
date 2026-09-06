// Límites del plan demo: cuentas de prueba para negocios que todavía no se
// deciden. La demo NO tiene fecha de vencimiento (no es un trial), pero sí
// es muy limitada frente a un plan pago:
//   - Fidelización queda completamente bloqueada (no se provisiona cuenta en
//     gogo-lealtad al registrarse -- ver registro.js), mostrando en su lugar
//     un mensaje para activar un plan.
//   - Menú digital queda disponible pero con topes bajos, solo para probar
//     cómo se ve, no para operar el negocio de verdad.
// Un plan pago (start/plus/pro) nunca pasa por estos topes.

export const DEMO_MAX_CATEGORIES = 1;
export const DEMO_MAX_PRODUCTS = 3;

export function isDemoPlan(merchant) {
  return !!merchant && merchant.plan === "demo";
}
