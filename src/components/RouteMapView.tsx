import { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
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
 * Mapa de trayecto origen -> destino, mismo enfoque sin costo que ya usa la
 * extensión de Shotra en InOut: Leaflet + tiles de OpenStreetMap + ruta real
 * por OSRM (o línea punteada si OSRM falla). Se renderiza en un WebView
 * porque React Native no tiene DOM: es la única forma de usar Leaflet aquí.
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
      <WebView
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        originWhitelist={['*']}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accent} />
          </View>
        )}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
