import { Platform } from 'react-native';

/**
 * Avisos del navegador (solo web). En el celular los maneja expo-notifications
 * (push + bandeja); en la web no hay push, así que mientras la pestaña está
 * abierta pero no visible se muestra una notificación del navegador para cada
 * novedad que trae el polling, y el título de la pestaña lleva el contador.
 *
 * El permiso se pide solo con un clic del usuario (Avisos → "Activar"): los
 * navegadores bloquean o silencian las solicitudes que no vienen de un gesto.
 */

export type BrowserPermission = 'granted' | 'denied' | 'default' | 'unsupported';

function hasApi(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;
}

export function browserPermission(): BrowserPermission {
  return hasApi() ? (Notification.permission as BrowserPermission) : 'unsupported';
}

/** Llamar solo desde un clic. Devuelve el permiso resultante. */
export async function requestBrowserPermission(): Promise<BrowserPermission> {
  if (!hasApi()) return 'unsupported';
  try {
    return (await Notification.requestPermission()) as BrowserPermission;
  } catch {
    return browserPermission();
  }
}

/**
 * Muestra el aviso si hay permiso y la pestaña no está a la vista (con la
 * pestaña visible ya está el banner propio de la app). Al tocarlo, enfoca la
 * pestaña y ejecuta onClick (navegar al chat, contrato o solicitud).
 */
export function showBrowserNotification(n: { id: string; title: string; body: string }, onClick: () => void): void {
  if (browserPermission() !== 'granted' || typeof document === 'undefined') return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return;
  try {
    const note = new Notification(n.title, { body: n.body, tag: n.id, icon: '/icons/icon-192.png' });
    note.onclick = () => {
      window.focus();
      onClick();
      note.close();
    };
  } catch {
    // Algunos navegadores (Chrome en Android) solo permiten avisos desde un
    // service worker: ahí queda el banner propio de la app.
  }
}

const BASE_TITLE_ATTR = 'data-shotra-title';

/**
 * "(3) Shotra": antepone los pendientes al título de la pestaña. expo-router
 * cambia el título al navegar, así que se vigila el <title> y se vuelve a
 * aplicar el contador sobre el título nuevo.
 */
let titleObserver: MutationObserver | null = null;
let currentCount = 0;

function applyTitle(): void {
  const el = document.querySelector('title');
  if (!el) return;
  const raw = (el.textContent || '').replace(/^\(\d+\+?\)\s*/, '');
  const next = currentCount > 0 ? `(${currentCount > 99 ? '99+' : currentCount}) ${raw}` : raw;
  if (el.textContent !== next) el.textContent = next;
  el.setAttribute(BASE_TITLE_ATTR, raw);
}

export function setTitleBadge(count: number): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  currentCount = Math.max(0, count || 0);
  applyTitle();
  if (!titleObserver && typeof MutationObserver !== 'undefined') {
    const el = document.querySelector('title');
    if (!el) return;
    titleObserver = new MutationObserver(() => applyTitle());
    titleObserver.observe(el, { childList: true, characterData: true, subtree: true });
  }
}
