/**
 * "Pedidos en ruta": el domiciliario publica un trayecto que ya va a hacer y
 * Shotra le sugiere los pedidos que caen en su camino. Tipos y textos que
 * comparten Mis rutas, Nueva ruta y el detalle de la ruta.
 */
import * as Location from 'expo-location';
import { api } from './api';
import type { RoutePoint } from '../components/routeMapHtml';

export type PackageSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type DetourPreset = 'SHORT' | 'MEDIUM' | 'WIDE';
export type RouteStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface ProviderRoute {
  id: string;
  originLatitude: number;
  originLongitude: number;
  originAddress: string | null;
  destLatitude: number;
  destLongitude: number;
  destAddress: string | null;
  distanceM: number;
  durationS: number;
  departAt: string;
  arriveAt: string;
  corridorM: number;
  maxDetourM: number;
  maxDetourS: number;
  maxPackageSize: PackageSize;
  maxOrders: number;
  status: RouteStatus;
  matchesCount?: number;
  /** GeoJSON LineString ([lng, lat]); solo en el detalle. */
  geometry?: { type: 'LineString'; coordinates: [number, number][] } | null;
}

export interface RouteMatch {
  id: string;
  routeId: string;
  requestId: string;
  pickupFraction: number;
  dropoffFraction: number;
  detourM: number | null;
  detourS: number | null;
  etaPickupAt: string;
  status: 'SUGGESTED' | 'DISMISSED' | 'PROPOSED' | 'EXPIRED';
  request: {
    id: string;
    title: string;
    description: string;
    status: string;
    budgetMin: number | null;
    budgetMax: number | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    originAddress: string | null;
    originLatitude: number | null;
    originLongitude: number | null;
    scheduledAt: string | null;
    isUrgent: boolean;
    packageSize: PackageSize | null;
    category?: { id: string; name: string } | null;
    requester?: { displayName: string; avatarUrl?: string | null } | null;
  };
  myProposal: { id: string; status: string; price: number } | null;
}

export interface CreateRouteBody {
  originLatitude: number;
  originLongitude: number;
  originAddress?: string;
  destLatitude: number;
  destLongitude: number;
  destAddress?: string;
  departAt?: string;
  detour?: DetourPreset;
  maxPackageSize?: PackageSize;
  maxOrders?: number;
}

export const routesApi = {
  mine: () => api.get<ProviderRoute[]>('/routes/mine'),
  detail: (id: string) => api.get<ProviderRoute>(`/routes/${id}`),
  matches: (id: string) => api.get<RouteMatch[]>(`/routes/${id}/matches`),
  create: (body: CreateRouteBody) => api.post<ProviderRoute>('/routes', body),
  dismiss: (id: string, matchId: string) => api.patch(`/routes/${id}/matches/${matchId}/dismiss`, {}),
  complete: (id: string) => api.patch(`/routes/${id}/complete`, {}),
  cancel: (id: string) => api.patch(`/routes/${id}/cancel`, {}),
  coverage: (q: {
    pickLat: number; pickLng: number; dropLat: number; dropLng: number;
    categoryId?: string; urgent?: boolean; packageSize?: PackageSize;
  }) => {
    // A mano: URLSearchParams de React Native está incompleto en el celular
    const params: Record<string, string | undefined> = {
      pickLat: String(q.pickLat),
      pickLng: String(q.pickLng),
      dropLat: String(q.dropLat),
      dropLng: String(q.dropLng),
      categoryId: q.categoryId,
      urgent: q.urgent === undefined ? undefined : String(q.urgent),
      packageSize: q.packageSize,
    };
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&');
    return api.get<{ count: number }>(`/routes/coverage?${qs}`);
  },
};

export const PACKAGE_OPTIONS: { value: PackageSize; label: string; hint: string }[] = [
  { value: 'SMALL', label: 'Pequeño', hint: 'Cabe en un morral' },
  { value: 'MEDIUM', label: 'Mediano', hint: 'Caja de moto' },
  { value: 'LARGE', label: 'Grande', hint: 'Necesita carro' },
];

export const DETOUR_OPTIONS: { value: DetourPreset; label: string; hint: string }[] = [
  { value: 'SHORT', label: 'Poco', hint: 'Hasta 1 km o 5 min' },
  { value: 'MEDIUM', label: 'Normal', hint: 'Hasta 2 km o 10 min' },
  { value: 'WIDE', label: 'Bastante', hint: 'Hasta 4 km o 20 min' },
];

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  ACTIVE: 'Activa',
  COMPLETED: 'Terminada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Vencida',
};

export function packageLabel(size: PackageSize | null | undefined): string {
  return PACKAGE_OPTIONS.find((o) => o.value === (size || 'SMALL'))!.label;
}

export function km(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function minutes(s: number): string {
  const min = Math.round(s / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

export function clock(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return time;
  return `${d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })} ${time}`;
}

/** Desvío real (OSRM) o, si no lo hubo, un texto neutro. */
export function detourText(m: RouteMatch): string {
  if (m.detourM == null || m.detourS == null) return 'Desvío corto';
  if (m.detourM < 150) return 'Sin desvío';
  return `+${km(m.detourM)} · +${minutes(m.detourS)}`;
}

/** Geocodifica con Nominatim (OpenStreetMap, sin costo), igual que Publicar solicitud. */
export async function geocode(address: string): Promise<RoutePoint | null> {
  const q = encodeURIComponent(`${address}, Colombia`);
  // En Android/iOS fetch no manda Referer: Nominatim exige identificar la app
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
    headers: { 'User-Agent': 'ShotraApp/1.0 (contacto@cyclonet.com.co)' },
  });
  const results: Array<{ lat: string; lon: string }> = res.ok ? await res.json() : [];
  const hit = results?.[0];
  return hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
}

/** Ubicación actual, o null si no hay permiso. */
export async function currentPosition(): Promise<RoutePoint | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({});
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
