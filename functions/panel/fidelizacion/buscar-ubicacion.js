import { requireMerchant } from "../../lib/auth.js";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

// Busca el negocio en Google Maps (Places API, Text Search) para poder
// autocompletar la ubicación exacta del "Recordatorio de cercanía" en vez de
// que el dueño tenga que copiar coordenadas a mano. env.GOOGLE_PLACES_API_KEY
// se configura como variable de entorno del proyecto Pages (Settings >
// Environment variables): una API key de Google Cloud con la "Places API
// (New)" habilitada, restringida por IP ya que esta llamada es
// servidor-a-servidor (nunca sale del navegador del dueño).
//
// El field mask pide solo id/nombre/dirección/ubicación -- eso cae en el SKU
// "Text Search Pro", que tiene su propio cupo gratis mensual bastante alto
// para lo poco que se usa esto (una vez por negocio, no por cliente).
export async function onRequestPost({ request, env }) {
  const merchant = await requireMerchant(request, env);
  if (!merchant) return json({ error: "No autorizado." }, 401);

  if (!env.GOOGLE_PLACES_API_KEY) {
    return json({ error: "La búsqueda en Google Maps todavía no está configurada." }, 500);
  }

  const body = await request.json().catch(() => ({}));
  const query = String(body.query || "").trim();
  if (!query) return json({ error: "Escribe el nombre o la dirección del negocio." }, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "es" }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("buscar-ubicacion (Places API) fetch failed:", err.message || err);
    return json({ error: "No se pudo conectar con Google Maps." }, 502);
  } finally {
    clearTimeout(timeout);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    console.error("buscar-ubicacion (Places API) error:", res.status, data);
    return json({ error: data?.error?.message || "Google Maps no pudo procesar la búsqueda." }, res.status >= 400 && res.status < 600 ? res.status : 502);
  }

  const results = (data?.places || [])
    .slice(0, 5)
    .filter((p) => p.location && Number.isFinite(p.location.latitude) && Number.isFinite(p.location.longitude))
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      latitude: p.location.latitude,
      longitude: p.location.longitude,
    }));

  return json({ results });
}
