import { createElement, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeProvider';
import { RoutePoint, buildRouteMapHtml } from './routeMapHtml';

export type { RoutePoint };

interface RouteMapViewProps {
  /** Punto de recogida (opcional: si falta, solo se muestra el destino). */
  origin?: RoutePoint | null;
  /** Punto de entrega/ejecución. */
  destination?: RoutePoint | null;
  height?: number;
}

/**
 * Versión web del mapa de trayecto (Metro la elige sola en el navegador):
 * react-native-webview no existe en web, así que el mismo HTML va en un iframe
 * srcdoc. Dos reglas que no se pueden romper:
 * - Sin sandbox: un iframe aislado tiene origen opaco y no envía Referer, y los
 *   tiles de OpenStreetMap responden "Access blocked" (403).
 * - Leaflet de /vendor/leaflet (copia propia en public/), no de un CDN: sin
 *   sandbox el mapa comparte origen con la app y vería la sesión.
 * No es una página aparte (/route-map.html): la regla SPA de Amplify la
 * reescribía a la app ("Unmatched Route"). Los .js/.css nunca se reescriben.
 */
export function RouteMapView({ origin, destination, height = 220 }: RouteMapViewProps) {
  const { theme } = useTheme();
  const html = useMemo(
    () => buildRouteMapHtml(origin, destination, `${window.location.origin}/vendor/leaflet`),
    [origin?.lat, origin?.lng, destination?.lat, destination?.lng],
  );

  if (!origin && !destination) return null;

  return (
    <View style={[styles.wrap, { height, backgroundColor: theme.glass }]}>
      {createElement('iframe', {
        srcDoc: html,
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
