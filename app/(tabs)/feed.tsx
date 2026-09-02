import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Animated, Easing, Platform, Pressable } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/services/api';
import { useNotifications } from '../../src/context/NotificationsContext';
import { useGlass } from '../../src/context/ThemeProvider';

const useNativeDriver = Platform.OS !== 'web';

/** Icono representativo segun el nombre de la categoria */
function categoryIcon(name?: string): any {
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
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (unread > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: useNativeDriver }),
          Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: useNativeDriver }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [unread, pulse]);

  return (
    <TouchableOpacity style={styles.bell} onPress={onPress}>
      <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={24} color={unread > 0 ? accent : text} />
      {unread > 0 && (
        <Animated.View style={[styles.badge, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

/** Tarjeta con animacion de entrada escalonada y escala al presionar */
function AnimatedCard({ index, children, onPress }: { index: number; children: React.ReactNode; onPress: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 8) * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNativeDriver,
    }).start();
  }, [anim, index]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: useNativeDriver }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: useNativeDriver }).start()}
      >
        {children}
      </Pressable>
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
  const glass = useGlass();
  const theme = glass.theme;

  const loadFeed = useCallback(async () => {
    try {
      // TODO: obtener ubicacion real del usuario
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
    <AnimatedCard index={index} onPress={() => router.push(`/request/${item.id}`)}>
      <View style={[styles.card, glass.card]}>
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, glass.chip]}>
            <Ionicons name={categoryIcon(item.category?.name)} size={13} color={theme.accent} />
            <Text style={[styles.categoryText, { color: theme.text }]}>{item.category?.name}</Text>
          </View>
          {item.isUrgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={12} color="#fff" />
              <Text style={styles.urgentText}>Urgente</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: theme.textMuted }]} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.budgetWrap}>
            <Ionicons name="cash-outline" size={15} color={theme.accent} />
            <Text style={[styles.budget, { color: theme.accent }]}>{formatBudget(item.budgetMin, item.budgetMax)}</Text>
          </View>
          <View style={styles.meta}>
            {item.distance !== undefined && (
              <View style={styles.metaChip}>
                <Ionicons name="location-outline" size={12} color={theme.textMuted} />
                <Text style={[styles.metaText, { color: theme.textMuted }]}>{item.distance} km</Text>
              </View>
            )}
            <View style={styles.metaChip}>
              <Ionicons name="chatbubble-ellipses-outline" size={12} color={theme.textMuted} />
              <Text style={[styles.metaText, { color: theme.textMuted }]}>{item._count?.proposals || 0}</Text>
            </View>
          </View>
        </View>
      </View>
    </AnimatedCard>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Explorar servicios</Text>
        <NotificationBell unread={unread} onPress={() => router.push('/notifications')} accent={theme.accent} text={theme.text} />
      </View>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No hay solicitudes cerca de ti</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Activa tu ubicacion para ver servicios cercanos</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 56 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bell: { padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ff4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  list: { padding: 16, paddingTop: 8 },
  card: { backgroundColor: '#111', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1c1c1c', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  categoryText: { color: '#ccc', fontSize: 12, fontWeight: '600' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ff4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgentText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  budget: { fontSize: 16, fontWeight: '800', color: '#4ecdc4' },
  meta: { flexDirection: 'row', gap: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#888', fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 6 },
});
