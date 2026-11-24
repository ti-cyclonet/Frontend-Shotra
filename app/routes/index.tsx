import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/context/ThemeProvider';
import { Text, PressableCard, Button, Badge, IconChip, spacing, radius } from '../../src/components/ui';
import { ProviderRoute, routesApi, ROUTE_STATUS_LABEL, clock, km, minutes } from '../../src/services/routes';
import { useNav, headerTop } from '../../src/web/nav';

/** Mis rutas: los trayectos que publiqué y cuántos pedidos me esperan en cada uno. */
export default function MyRoutesScreen() {
  const nav = useNav();
  const { theme } = useTheme();
  const [routes, setRoutes] = useState<ProviderRoute[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRoutes(await routesApi.mine());
    } catch {
      setRoutes((r) => r ?? []);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const active = (routes ?? []).filter((r) => r.status === 'ACTIVE');
  const past = (routes ?? []).filter((r) => r.status !== 'ACTIVE');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => nav.back('/(tabs)/profile')}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text variant="h2">Mis rutas</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={[...active, ...past]}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing[4] }}>
            <Text variant="body" muted>
              Cuéntanos un trayecto que ya vas a hacer y te mostramos los domicilios que quedan en tu camino.
              Ganas por un viaje que igual ibas a hacer.
            </Text>
            <Button
              label="Publicar una ruta"
              variant="gradient"
              icon="navigate"
              fullWidth
              onPress={() => nav.open('/routes/new')}
              style={{ marginTop: spacing[4] }}
            />
          </View>
        }
        renderItem={({ item, index }) => {
          const isActive = item.status === 'ACTIVE';
          return (
            <>
              {index === active.length && past.length > 0 && (
                <Text variant="sectionLabel" muted style={styles.groupLabel}>Anteriores</Text>
              )}
              <PressableCard
                padding={14}
                rounded={radius.xl}
                onPress={() => nav.open(`/routes/${item.id}`)}
                style={[styles.card, !isActive && { opacity: 0.7 }]}
              >
                <IconChip icon={isActive ? 'navigate' : 'flag-outline'} color={isActive ? 'red' : 'neutral'} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.originAddress || 'Mi punto de salida'} → {item.destAddress || 'Destino'}
                  </Text>
                  <Text variant="caption" muted>
                    Sale {clock(item.departAt)} · {km(item.distanceM)} · {minutes(item.durationS)}
                  </Text>
                </View>
                {isActive ? (
                  item.matchesCount ? (
                    <Badge label={`${item.matchesCount} pedido${item.matchesCount === 1 ? '' : 's'}`} solid />
                  ) : (
                    <Badge label="Buscando" color="neutral" />
                  )
                ) : (
                  <Badge label={ROUTE_STATUS_LABEL[item.status]} color="neutral" />
                )}
              </PressableCard>
            </>
          );
        }}
        ListEmptyComponent={
          routes ? (
            <View style={styles.empty}>
              <IconChip icon="map-outline" color="neutral" size={56} />
              <Text variant="body" muted style={{ marginTop: spacing[3], textAlign: 'center' }}>
                Aún no has publicado rutas.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: headerTop(52) },
  backButton: { padding: 4 },
  list: { padding: 16, paddingTop: 4, paddingBottom: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  groupLabel: { marginTop: spacing[4], marginBottom: spacing[2] },
  empty: { alignItems: 'center', paddingTop: 40 },
});
