/**
 * Ruta a la que volver después de iniciar sesión. Si alguien sin sesión abre un
 * enlace directo (una solicitud compartida por WhatsApp, un chat desde un aviso
 * del navegador, shotra://contract/…), se le lleva al login y, al entrar, se
 * abre lo que había pedido. Vive en memoria: el login ocurre en la misma sesión.
 */
let pending: string | null = null;

/** Solo rutas internas de la app (nada de URLs externas ni de las de login). */
export function setReturnTo(path: string | null | undefined): void {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return;
  if (path === '/' || /^\/(\(auth\)|login|register|legal)\b/.test(path)) return;
  pending = path;
}

/** Devuelve la ruta guardada (una sola vez). */
export function takeReturnTo(): string | null {
  const p = pending;
  pending = null;
  return p;
}
