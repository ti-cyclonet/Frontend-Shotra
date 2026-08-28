import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

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

  const renderItem = ({ item }: { item: ServiceRequest }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category?.name}</Text>
        </View>
        {item.isUrgent && (
          <View style={styles.urgentBadge}>
            <Ionicons name="flash" size={12} color="#fff" />
            <Text style={styles.urgentText}>Urgente</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.budget}>{formatBudget(item.budgetMin, item.budgetMax)}</Text>
        <View style={styles.meta}>
          {item.distance !== undefined && (
            <Text style={styles.metaText}>{item.distance} km</Text>
          )}
          <Text style={styles.metaText}>{item._count?.proposals || 0} propuestas</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar servicios</Text>
        <TouchableOpacity>
          <Ionicons name="filter" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No hay solicitudes cerca de ti</Text>
            <Text style={styles.emptySubtext}>Activa tu ubicacion para ver servicios cercanos</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 56 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  list: { padding: 16, paddingTop: 8 },
  card: { backgroundColor: '#111', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  categoryBadge: { backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ff4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgentText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budget: { fontSize: 16, fontWeight: '800', color: '#4ecdc4' },
  meta: { flexDirection: 'row', gap: 12 },
  metaText: { color: '#666', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 6 },
});
