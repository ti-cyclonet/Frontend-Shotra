/**
 * Navegación de la versión web ancha (estilo WhatsApp Web).
 *
 * En pantallas anchas (web ≥ WIDE_MIN px) la app se divide en tres zonas:
 * barra lateral de íconos | lista de la pestaña activa | panel de detalle.
 * Las pantallas de detalle (chat, solicitud, contrato, ofertante, ...) se abren
 * en el panel de la derecha en vez de tapar la lista. En el celular (o una
 * ventana angosta) todo sigue igual: cada detalle es una pantalla completa.
 *
 * Las pantallas no llaman router.push/back para ir a un detalle: usan
 * useNav().open / useNav().back, que eligen entre el panel y el router.
 */
import { createContext, useContext, useSyncExternalStore, ReactNode } from 'react';
import { Dimensions, Platform, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

/** Ancho mínimo de ventana para el diseño de tres zonas. */
export const WIDE_MIN = 900;

export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WIDE_MIN;
}

/** Rutas que en web ancha se abren en el panel de detalle. */
const DETAIL_PATTERNS = [
  /^\/chat\/[^/]+$/,
  /^\/request\/[^/]+$/,
  /^\/contract\/[^/]+$/,
  /^\/provider\/[^/]+$/,
  /^\/notifications$/,
  /^\/account-statement$/,
  /^\/edit-profile$/,
  /^\/portfolio-settings$/,
];

export function isDetailPath(path: string): boolean {
  return DETAIL_PATTERNS.some((re) => re.test(path));
}

// ─── Pila del panel de detalle ─────────────────────────────────────────────
// Store mínimo (sin dependencias) para que también lo usen los contextos que
// navegan fuera de un componente (p. ej. el banner de notificaciones).

let stack: string[] = [];
/** El shell de tres zonas está visible (web ancha y pestañas enfocadas). */
let shellActive = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function setShellActive(active: boolean) {
  shellActive = active;
}

function usesPane(path: string): boolean {
  return shellActive && Platform.OS === 'web' && Dimensions.get('window').width >= WIDE_MIN && isDetailPath(path);
}

/**
 * Abre una ruta. Desde la lista (o fuera de componentes) reemplaza lo que haya
 * en el panel, como al elegir otro chat en WhatsApp; desde un detalle se apila
 * encima para poder volver.
 */
export function openRoute(path: string, opts: { push?: boolean } = {}) {
  if (usesPane(path)) {
    stack = opts.push ? [...stack, path] : [path];
    emit();
    return;
  }
  router.push(path as any);
}

/** Cierra el panel de detalle (vuelve a la portada). */
export function closeDetail() {
  if (!stack.length) return;
  stack = [];
  emit();
}

export function useDetailStack(): string[] {
  return useSyncExternalStore(subscribe, () => stack, () => stack);
}

/** Ruta abierta en el panel de detalle (null si está en la portada). */
export function useActiveDetail(): string | null {
  const s = useDetailStack();
  return s.length ? s[s.length - 1] : null;
}

// ─── Contexto de una pantalla embebida en el panel ─────────────────────────

interface EmbedValue {
  params: Record<string, string>;
}

const EmbedContext = createContext<EmbedValue | null>(null);

export function EmbedProvider({ params, children }: { params: Record<string, string>; children: ReactNode }) {
  return <EmbedContext.Provider value={{ params }}>{children}</EmbedContext.Provider>;
}

/** La pantalla se está mostrando dentro del panel de detalle. */
export function useEmbedded(): boolean {
  return useContext(EmbedContext) !== null;
}

/** Parámetros de la ruta: los del panel si está embebida, si no los de la URL. */
export function useRouteParams<T extends Record<string, string>>(): Partial<T> {
  const embed = useContext(EmbedContext);
  const urlParams = useLocalSearchParams<T>();
  return (embed ? embed.params : urlParams) as Partial<T>;
}

/**
 * Navegación para las pantallas: dentro del panel, abrir apila y volver
 * desapila (o cierra); fuera de él, se comporta como el router de siempre.
 */
export function useNav() {
  const embedded = useEmbedded();
  return {
    embedded,
    open: (path: string) => openRoute(path, { push: embedded }),
    /** Volver; `fallback` es la pestaña a la que ir si no hay historial. */
    back: (fallback: string) => {
      if (embedded) {
        stack = stack.slice(0, -1);
        emit();
        return;
      }
      if (router.canGoBack()) router.back();
      else router.push(fallback as any);
    },
  };
}

/** Espacio superior del encabezado: en web no hay barra de estado que librar. */
export function headerTop(native: number): number {
  return Platform.OS === 'web' ? 20 : native;
}
