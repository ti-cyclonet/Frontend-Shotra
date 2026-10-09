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
 * react-native-webview no existe en web, así que el mismo HTML de Leaflet va en
 * un iframe. sandbox sin allow-same-origin: el mapa corre aislado de la app (no
 * ve el token ni el localStorage de Shotra) y aun así carga tiles y la ruta de
 * OSRM, que responden con CORS abierto.
 */
export function RouteMapView({ origin, destination, height = 220 }: RouteMapViewProps) {
  const { theme } = useTheme();
  const html = useMemo(
    () => buildRouteMapHtml(origin, destination),
    [origin?.lat, origin?.lng, destination?.lat, destination?.lng],
  );

  if (!origin && !destination) return null;

  return (
    <View style={[styles.wrap, { height, backgroundColor: theme.glass }]}>
      {createElement('iframe', {
        srcDoc: html,
        title: 'Mapa del trayecto',
        sandbox: 'allow-scripts',
        loading: 'lazy',
        referrerPolicy: 'no-referrer',
        style: { width: '100%', height: '100%', border: 0, display: 'block' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, overflow: 'hidden' },
});
