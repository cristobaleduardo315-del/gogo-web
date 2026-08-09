// Ruta pública /menu/:slug — la lógica de render vive en
// lib/menuHomeRender.js para poder reusarla también desde el middleware
// raíz que atiende dominios propios de cada negocio (ver
// functions/_middleware.js).
import { renderMenuHome } from "../lib/menuHomeRender.js";

export async function onRequestGet({ params, env }) {
  return renderMenuHome(env, params.slug);
}
