import { destroySession, parseCookies, clearSessionCookie } from "./lib/auth.js";

export async function onRequestPost({ request, env }) {
  const cookies = parseCookies(request);
  await destroySession(env.DB, cookies.web_session);
  return new Response(null, {
    status: 302,
    headers: { Location: "/login", "Set-Cookie": clearSessionCookie() },
  });
}
