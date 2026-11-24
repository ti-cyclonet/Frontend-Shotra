import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeProvider';
import { alertDialog, confirmDialog } from '../../src/services/dialog';
import { Text, Card, Button, Badge, IconChip, SectionLabel, spacing, radius } from '../../src/components/ui';
import { RouteMapView, MapStop } from '../../src/components/RouteMapView';
import {
  ProviderRoute, RouteMatch, routesApi, ROUTE_STATUS_LABEL,
  clock, km, minutes, detourText, packageLabel, DETOUR_OPTIONS,
} from '../../src/services/routes';
import { useNav, useRouteParams, headerTop } from '../../src/web/nav';

const money = (n: number) => `$${(n || 0).toLocaleString('es-CO')}`;

function budget(r: RouteMatch['request']): string | null {
  if (r.budgetMin && r.budgetMax) return r.budgetMin === r.budgetMax ? money(r.budgetMin) : `${money(r.budgetMin)} - ${money(r.budgetMax)}`;
  if (r.budgetMin) return `Desde ${money(r.budgetMin)}`;
  if (r.budgetMax) return `Hasta ${money(r.budgetMax)}`;
  return null;
}

/** Nivel de desvío elegido, a partir de lo que guardó la ruta. */
function detourLevel(route: ProviderRoute): string {
  if (route.maxDetourM <= 1000) return DETOUR_OPTIONS[0].label;
  if (route.maxDetourM <= 2000) return DETOUR_OPTIONS[1].label;
  return DETOUR_OPTIONS[2].label;
}

export default function RouteDetailScreen() {
  const nav = useNav();
  const { theme } = useTheme();
  const { id } = useRouteParams<{ id: string }>();
  const [route, setRoute] = useState<ProviderRoute | null>(null);
  const [matches, setMatches] = useState<RouteMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [r, m] = await Promise.all([routesApi.detail(id), routesApi.matches(id)]);
      setRoute(r);
      setMatches(m);
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo cargar la ruta');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Al volver de ofertar, la coincidencia ya sale como "Ofertaste"
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const dismiss = async (m: RouteMatch) => {
    try {
      await routesApi.dismiss(m.routeId, m.id);
      setMatches((list) => list.filter((x) => x.id !== m.id));
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo descartar');
    }
  };

  const close = async (kind: 'complete' | 'cancel') => {
    if (!route) return;
    const ok = await confirmDialog(
      kind === 'complete' ? 'Terminar ruta' : 'Cancelar ruta',
      kind === 'complete'
        ? 'Ya llegaste: dejarás de recibir pedidos en esta ruta. Los contratos que ya tienes siguen igual.'
        : 'No harás este viaje: dejarás de recibir pedidos en esta ruta. Los contratos que ya tienes siguen igual.',
      kind === 'complete' ? 'Terminar' : 'Cancelar ruta',
      'Volver',
    );
    if (!ok) return;
    setClosing(true);
    try {
      if (kind === 'complete') await routesApi.complete(route.id);
      else await routesApi.cancel(route.id);
      await load();
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo cerrar la ruta');
    } finally {
      setClosing(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => nav.back('/routes')}>
        <Ionicons name="arrow-back" size={22} color={theme.text} />
      </TouchableOpacity>
      <Text variant="h2">Mi ruta</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (loading || !route) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {header}
        <Text variant="body" muted style={{ textAlign: 'center', marginTop: 40 }}>
          {loading ? 'Cargando...' : 'Ruta no encontrada'}
        </Text>
      </View>
    );
  }

  const isActive = route.status === 'ACTIVE';
  const stops: MapStop[] = matches.flatMap((m) => [
    ...(m.request.originLatitude != null && m.request.originLongitude != null
      ? [{ lat: m.request.originLatitude, lng: m.request.originLongitude, kind: 'pickup' as const }]
      : []),
    ...(m.request.latitude != null && m.request.longitude != null
      ? [{ lat: m.request.latitude, lng: m.request.longitude, kind: 'dropoff' as const }]
      : []),
  ]);
  const suggested = matches.filter((m) => !m.myProposal);
  const proposed = matches.filter((m) => m.myProposal);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
    >
      {header}

      <RouteMapView
        origin={{ lat: route.originLatitude, lng: route.originLongitude }}
        destination={{ lat: route.destLatitude, lng: route.destLongitude }}
        geometry={route.geometry?.coordinates}
        stops={stops}
        height={240}
      />
      {stops.length > 0 && (
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: '#2563eb' }]} />
          <Text variant="caption" muted>Recogida</Text>
          <View style={[styles.dot, { backgroundColor: '#16a34a', marginLeft: spacing[3] }]} />
          <Text variant="caption" muted>Entrega</Text>
        </View>
      )}

      <Card padding={16} rounded={radius.xl} style={{ marginTop: spacing[3] }}>
        <View style={styles.row}>
          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
            {route.originAddress || 'Mi punto de salida'} → {route.destAddress || 'Destino'}
          </Text>
          <Badge label={ROUTE_STATUS_LABEL[route.status]} color={isActive ? 'green' : 'neutral'} />
        </View>
        <Text variant="caption" muted style={{ marginTop: spacing[2] }}>
          Sale {clock(route.departAt)} · llega {clock(route.arriveAt)} · {km(route.distanceM)} · {minutes(route.durationS)}
        </Text>
        <Text variant="caption" muted style={{ marginTop: 2 }}>
          Desvío {detourLevel(route).toLowerCase()} · paquete hasta {packageLabel(route.maxPackageSize).toLowerCase()} · hasta {route.maxOrders} pedido{route.maxOrders === 1 ? '' : 's'}
        </Text>
      </Card>

      <SectionLabel>{isActive ? `Pedidos en tu camino (${suggested.length})` : 'Pedidos en esta ruta'}</SectionLabel>
      {suggested.length === 0 && proposed.length === 0 && (
        <Card padding={16} rounded={radius.xl} style={styles.emptyCard}>
          <IconChip icon="hourglass-outline" color="neutral" />
          <Text variant="body" muted style={{ flex: 1 }}>
            {isActive
              ? 'Aún no hay pedidos en tu camino. Te avisamos cuando aparezca uno.'
              : 'Esta ruta ya no recibe pedidos.'}
          </Text>
        </Card>
      )}
      {suggested.map((m) => (
        <MatchCard
          key={m.id}
          m={m}
          active={isActive}
          onOffer={() => nav.open(`/request/${m.requestId}?routeId=${route.id}`)}
          onOpen={() => nav.open(`/request/${m.requestId}`)}
          onDismiss={() => dismiss(m)}
        />
      ))}

      {proposed.length > 0 && (
        <>
          <SectionLabel>Ya ofertaste</SectionLabel>
          {proposed.map((m) => (
            <MatchCard key={m.id} m={m} active={false} onOpen={() => nav.open(`/request/${m.requestId}`)} />
          ))}
        </>
      )}

      {isActive && (
        <View style={styles.actions}>
          <Button label="Ya llegué" variant="primary" icon="flag" onPress={() => close('complete')} disabled={closing} style={{ flex: 1 }} />
          <Button label="Cancelar ruta" variant="outline" icon="close" onPress={() => close('cancel')} disabled={closing} style={{ flex: 1 }} />
        </View>
      )}
    </ScrollView>
  );
}

function MatchCard({ m, active, onOffer, onOpen, onDismiss }: {
  m: RouteMatch;
  active: boolean;
  onOffer?: () => void;
  onOpen: () => void;
  onDismiss?: () => void;
}) {
  const { theme } = useTheme();
  const r = m.request;
  const b = budget(r);
  const PROPOSAL_LABEL: Record<string, string> = {
    PENDING: 'Oferta enviada',
    ACCEPTED: 'Oferta aceptada',
    REJECTED: 'No seleccionada',
    WITHDRAWN: 'Oferta retirada',
  };
  return (
    <Card padding={14} rounded={radius.xl} style={{ marginBottom: spacing[2] }}>
      <TouchableOpacity onPress={onOpen}>
        <View style={styles.row}>
          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{r.title}</Text>
          {r.isUrgent && <Badge label="Urgente" color="red" />}
        </View>
        <Text variant="caption" muted numberOfLines={1} style={{ marginTop: 2 }}>
          {r.originAddress || 'Recogida'} → {r.address || 'Entrega'}
        </Text>
        <View style={[styles.row, { marginTop: spacing[2], flexWrap: 'wrap' }]}>
          <Meta icon="time-outline" text={`Pasas ${clock(m.etaPickupAt)}`} />
          <Meta icon="git-branch-outline" text={detourText(m)} />
          <Meta icon="cube-outline" text={packageLabel(r.packageSize)} />
          {b && <Meta icon="cash-outline" text={b} color={theme.accent} />}
        </View>
      </TouchableOpacity>

      {m.myProposal ? (
        <Text variant="captionStrong" color={theme.accent} style={{ marginTop: spacing[2] }}>
          {PROPOSAL_LABEL[m.myProposal.status] || 'Ofertaste'} · {money(m.myProposal.price)}
        </Text>
      ) : active ? (
        <View style={[styles.row, { marginTop: spacing[3] }]}>
          <Button label="Ofertar" size="sm" icon="paper-plane" onPress={onOffer} style={{ flex: 1 }} />
          <Button label="No me sirve" size="sm" variant="ghost" onPress={onDismiss} />
        </View>
      ) : null}
    </Card>
  );
}

function Meta({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={color || theme.textMuted} />
      <Text variant="caption" color={color || theme.textMuted}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 0, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingTop: headerTop(52) },
  backButton: { padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: spacing[3] },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing[2] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[6] },
});
