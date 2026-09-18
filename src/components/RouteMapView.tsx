import { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeProvider';

export interface RoutePoint {
  lat: number;
  lng: number;
}

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
    () => buildHtml(origin || null, destination || null),
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

function buildHtml(origin: RoutePoint | null, destination: RoutePoint | null): string {
  const points: RoutePoint[] = [];
  if (origin) points.push(origin);
  if (destination) points.push(destination);
  const center = points[0] || { lat: 4.6097, lng: -74.0817 };

  const originMarker = origin
    ? `L.marker([${origin.lat}, ${origin.lng}], { icon: originIcon }).addTo(map);`
    : '';
  const destMarker = destination
    ? `L.marker([${destination.lat}, ${destination.lng}], { icon: destIcon }).addTo(map);`
    : '';

  const routeScript =
    origin && destination
      ? `
        var pts = [[${origin.lat}, ${origin.lng}], [${destination.lat}, ${destination.lng}]];
        map.fitBounds(pts, { padding: [30, 30] });
        fetch('https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometry=geojson')
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function (data) {
            var coords = data && data.routes && data.routes[0] && data.routes[0].geometry.coordinates;
            if (coords && coords.length) {
              var latlngs = coords.map(function (c) { return [c[1], c[0]]; });
              L.polyline(latlngs, { color: '#dc2626', weight: 4, opacity: 0.85 }).addTo(map);
            } else {
              L.polyline(pts, { color: '#dc2626', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(map);
            }
          })
          .catch(function () {
            L.polyline(pts, { color: '#dc2626', weight: 3, opacity: 0.7, dashArray: '6 6' }).addTo(map);
          });
      `
      : origin || destination
        ? `map.setView([${(origin || destination)!.lat}, ${(origin || destination)!.lng}], 15);`
        : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; background: #eef0f2; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${center.lat}, ${center.lng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    var originIcon = L.divIcon({ className: '', html: '🏪', iconSize: [28, 28], iconAnchor: [14, 14] });
    var destIcon = L.divIcon({ className: '', html: '📍', iconSize: [28, 36], iconAnchor: [14, 32] });
    ${originMarker}
    ${destMarker}
    ${routeScript}
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
