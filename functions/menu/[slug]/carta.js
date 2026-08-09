// Ruta pública /menu/:slug/carta — la lógica de render vive en
// lib/menuCartaRender.js para poder reusarla también desde el middleware
// raíz que atiende dominios propios de cada negocio (ver
// functions/_middleware.js).
import { renderMenuCarta } from "../../lib/menuCartaRender.js";

export async function onRequestGet({ params, env }) {
  return renderMenuCarta(env, params.slug);
}
