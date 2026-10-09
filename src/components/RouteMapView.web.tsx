import { createElement } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeProvider';
import type { RoutePoint } from './routeMapHtml';

export type { RoutePoint };

interface RouteMapViewProps {
  /** Punto de recogida (opcional: si falta, solo se muestra el destino). */
  origin?: RoutePoint | null;
  /** Punto de entrega/ejecución. */
  destination?: RoutePoint | null;
  height?: number;
}

/** "lat,lng" solo si ambos son números válidos. */
function coord(p?: RoutePoint | null): string | null {
  if (!p) return null;
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : null;
}

/**
 * Versión web del mapa de trayecto (Metro la elige sola en el navegador).
 * react-native-webview no existe en web: el mapa es public/route-map.html, una
 * página propia de la app abierta en un iframe con el origen y el destino en la
 * URL. No se usa srcdoc: un iframe srcdoc aislado no envía Referer y los tiles
 * de OpenStreetMap responden "Access blocked" (403). La página comparte origen
 * con la app, por eso Leaflet va alojado en public/vendor y no en un CDN.
 */
export function RouteMapView({ origin, destination, height = 220 }: RouteMapViewProps) {
  const { theme } = useTheme();
  const o = coord(origin);
  const d = coord(destination);
  if (!o && !d) return null;

  const query = new URLSearchParams();
  if (o) query.set('o', o);
  if (d) query.set('d', d);

  return (
    <View style={[styles.wrap, { height, backgroundColor: theme.glass }]}>
      {createElement('iframe', {
        src: `/route-map.html?${query.toString()}`,
        title: 'Mapa del trayecto',
        loading: 'lazy',
        style: { width: '100%', height: '100%', border: 0, display: 'block' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, overflow: 'hidden' },
});
