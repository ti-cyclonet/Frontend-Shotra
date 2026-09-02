import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/services/api';
import { useGlass } from '../../src/context/ThemeProvider';

type Tab = 'requests' | 'proposals';

export default function ActivityScreen() {
  const glass = useGlass();
  const theme = glass.theme;
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);

  const load = useCallback(() => {
    api.get('/requests/mine').then(setRequests).catch(() => {});
    api.get('/proposals/mine').then(setProposals).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const statusColor: Record<string, string> = {
    PUBLISHED: '#4ecdc4', IN_PROPOSALS: '#f39c12', ACCEPTED: '#2ecc71',
    IN_PROGRESS: '#3498db', COMPLETED: '#9b59b6', CANCELLED: '#e74c3c',
    PENDING: '#f39c12', REJECTED: '#e74c3c', WITHDRAWN: '#7f8c8d',
  };

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendiente', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', WITHDRAWN: 'Retirada',
    PUBLISHED: 'Publicada', IN_PROPOSALS: 'Con propuestas', IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completada', CANCELLED: 'Cancelada',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Mi actividad</Text>
      </View>

      {/* Sub-tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, glass.chip, activeTab === 'requests' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'requests' ? theme.accentText : theme.textMuted }]}>
            Solicito ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, glass.chip, activeTab === 'proposals' && { backgroundColor: theme.accent, borderColor: theme.accent }]}
          onPress={() => setActiveTab('proposals')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'proposals' ? theme.accentText : theme.textMuted }]}>
            Ofrezco ({proposals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mis solicitudes (como solicitante) */}
      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, glass.card]} onPress={() => router.push(`/request/${item.id}`)}>
              <View style={styles.row}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor[item.status] || '#555' }]}>
                  <Text style={styles.statusText}>{statusLabel[item.status] || item.status}</Text>
                </View>
              </View>
              <Text style={[styles.category, { color: theme.textMuted }]}>{item.category?.name}</Text>
              <Text style={[styles.metaInfo, { color: theme.accent }]}>{item._count?.proposals || 0} propuestas recibidas</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No tienes solicitudes</Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Publica tu primera solicitud de servicio</Text>
            </View>
          }
        />
      )}

      {/* Mis propuestas (como ofertante) */}
      {activeTab === 'proposals' && (
        <FlatList
          data={proposals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, glass.card]}
              onPress={() =>
                item.status === 'ACCEPTED' && item.contract?.id
                  ? router.push(`/contract/${item.contract.id}`)
                  : router.push(`/request/${item.requestId || item.request?.id}`)
              }
            >
              <View style={styles.row}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.request?.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor[item.status] || '#555' }]}>
                  <Text style={styles.statusText}>{statusLabel[item.status] || item.status}</Text>
                </View>
              </View>
              <Text style={[styles.category, { color: theme.textMuted }]}>{item.request?.category?.name}</Text>
              <View style={styles.row}>
                <Text style={[styles.metaInfo, { color: theme.accent }]}>Mi oferta: ${item.price?.toLocaleString()}</Text>
                {item.status === 'ACCEPTED' && (
                  <Text style={styles.acceptedHint}>
                    {item.contract?.id ? 'Ver contrato →' : '¡Te la aceptaron! →'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No has enviado propuestas</Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Explora solicitudes y envia tu propuesta</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { padding: 16, paddingTop: 56 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  tabActive: { backgroundColor: '#4ecdc4', borderColor: '#4ecdc4' },
  tabText: { color: '#aaa', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#000' },
  list: { padding: 16, paddingTop: 8 },
  card: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  category: { color: '#888', fontSize: 13, marginBottom: 4 },
  metaInfo: { color: '#4ecdc4', fontSize: 13, fontWeight: '600' },
  acceptedHint: { color: '#2ecc71', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 6 },
});
