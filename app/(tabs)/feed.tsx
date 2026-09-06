import { View, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/services/api';
import { useNotifications } from '../../src/context/NotificationsContext';
import { useTheme } from '../../src/context/ThemeProvider';
import { Text, Card, IconChip, Badge, CountDot, spacing, radius, motion, typography } from '../../src/components/ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Icono representativo segun el nombre de la categoria */
function categoryIcon(name?: string): IoniconName {
  const n = (name || '').toLowerCase();
  if (n.includes('comida') || n.includes('delivery')) return 'fast-food';
  if (n.includes('mercado')) return 'cart';
  if (n.includes('mensaj') || n.includes('paquet')) return 'cube';
  if (n.includes('mudanz')) return 'car';
  if (n.includes('compra') || n.includes('mandad')) return 'bag-handle';
  if (n.includes('farmac') || n.includes('medic')) return 'medkit';
  return 'briefcase';
}

/** Campana con pulso cuando hay notificaciones sin leer */
function NotificationBell({ unread, onPress, accent, text }: { unread: number; onPress: () => void; accent: string; text: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (unread > 0) {
      scale.value = withRepeat(
        withSequence(withTiming(1.2, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1);
    }
  }, [unread, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPress={onPress} style={styles.bell} hitSlop={8}>
      <Animated.View style={style}>
        <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={24} color={unread > 0 ? accent : text} />
      </Animated.View>
      {unread > 0 && (
        <View style={styles.bellBadge}>
          <CountDot count={unread} />
        </View>
      )}
    </Pressable>
  );
}

/** Tarjeta presionable con micro-escala springy */
function FeedCard({ index, children, onPress }: { index: number; children: React.ReactNode; onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).springify().damping(16)}>
      <Animated.View style={style}>
        <Pressable
          onPress={onPress}
          onPressIn={() => (scale.value = withSpring(0.97, motion.spring))}
          onPressOut={() => (scale.value = withSpring(1, motion.spring))}
        >
          {children}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  isUrgent: boolean;
  address?: string;
  category: { name: string; icon?: string };
  requester: { displayName: string; averageRating: number };
  _count?: { proposals: number };
  distance?: number;
  createdAt: string;
}

export default function FeedScreen() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { unread } = useNotifications();
  const { theme } = useTheme();

  const loadFeed = useCallback(async () => {
    try {
      const data = await api.get<ServiceRequest[]>('/requests');
      setRequests(data);
    } catch (err) {
      console.log('Error cargando feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const onRefresh = () => { setRefreshing(true); loadFeed(); };

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return 'A convenir';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    return `$${(min || max)?.toLocaleString()}`;
  };

  const renderItem = ({ item, index }: { item: ServiceRequest; index: number }) => (
    <FeedCard index={index} onPress={() => router.push(`/request/${item.id}`)}>
      <Card padding={16} rounded={radius['2xl']} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.catRow}>
            <IconChip icon={categoryIcon(item.category?.name)} size={34} rounded={radius.md} />
            <Text variant="captionStrong" style={{ marginLeft: spacing[2] }}>{item.category?.name}</Text>
          </View>
          {item.isUrgent && (
            <Badge label="Urgente" color="red" />
          )}
        </View>
        <Text variant="cardTitle" style={{ marginBottom: 4 }}>{item.title}</Text>
        <Text variant="body" muted numberOfLines={2} style={{ marginBottom: spacing[3] }}>{item.description}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.budgetWrap}>
            <Ionicons name="cash-outline" size={16} color={theme.accent} />
            <Text variant="bodyStrong" color={theme.accent}>{formatBudget(item.budgetMin, item.budgetMax)}</Text>
          </View>
          <View style={styles.meta}>
            {item.distance !== undefined && (
              <View style={styles.metaChip}>
                <Ionicons name="location-outline" size={13} color={theme.textMuted} />
                <Text variant="caption" muted>{item.distance} km</Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={theme.textMuted} />
              <Text variant="caption" muted>{item._count?.proposals || 0}</Text>
            </View>
          </View>
        </View>
      </Card>
    </FeedCard>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text variant="sectionLabel" muted>Shotra</Text>
          <Text variant="h1">Explorar servicios</Text>
        </View>
        <NotificationBell unread={unread} onPress={() => router.push('/notifications')} accent={theme.accent} text={theme.text} />
      </View>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <IconChip icon="search-outline" color="neutral" size={64} rounded={radius['2xl']} />
              <Text variant="h2" style={{ marginTop: spacing[4] }}>Nada por aqui todavia</Text>
              <Text variant="body" muted style={{ marginTop: 6, textAlign: 'center' }}>Activa tu ubicacion para ver servicios cercanos</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing[5], paddingTop: 60, paddingBottom: spacing[3] },
  bell: { padding: 4 },
  bellBadge: { position: 'absolute', top: -2, right: -2 },
  list: { paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: 120 },
  card: { marginBottom: spacing[3] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] },
  catRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flexDirection: 'row', gap: spacing[3] },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: { alignItems: 'center', paddingTop: 100, paddingHorizontal: spacing[6] },
});
