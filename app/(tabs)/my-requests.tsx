import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    api.get('/requests/mine').then(setRequests).catch(() => {});
  }, []);

  const statusColor: Record<string, string> = {
    PUBLISHED: '#4ecdc4',
    IN_PROPOSALS: '#f39c12',
    ACCEPTED: '#2ecc71',
    IN_PROGRESS: '#3498db',
    COMPLETED: '#9b59b6',
    CANCELLED: '#e74c3c',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis solicitudes</Text>
      </View>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor[item.status] || '#555' }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.category}>{item.category?.name}</Text>
            <Text style={styles.proposals}>{item._count?.proposals || 0} propuestas recibidas</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No tienes solicitudes</Text>
            <Text style={styles.emptySubtext}>Publica tu primera solicitud de servicio</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 16, paddingTop: 56 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  list: { padding: 16, paddingTop: 8 },
  card: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  category: { color: '#888', fontSize: 13, marginBottom: 4 },
  proposals: { color: '#4ecdc4', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 6 },
});
