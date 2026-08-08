// Protege /panel/* con autenticación básica (usuario y contraseña).
// El usuario y la contraseña se leen de variables de entorno configuradas
// en Cloudflare Pages (Settings > Environment variables): GOGO_USER, GOGO_PASS.

export async function onRequest(context) {
  const { request, env, next } = context;

  const expectedUser = env.GOGO_USER || '';
  const expectedPass = env.GOGO_PASS || '';

  const authHeader = request.headers.get('Authorization');

  if (authHeader && authHeader.startsWith('Basic ')) {
    const encoded = authHeader.slice(6);
    let decoded = '';
    try {
      decoded = atob(encoded);
    } catch (e) {
      decoded = '';
    }
    const sep = decoded.indexOf(':');
    const user = sep >= 0 ? decoded.slice(0, sep) : decoded;
    const pass = sep >= 0 ? decoded.slice(sep + 1) : '';

    if (user === expectedUser && pass === expectedPass && expectedUser && expectedPass) {
      return next();
    }
  }

  return new Response('Acceso restringido', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="GoGo Panel", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=UTF-8',
    },
  });
}
