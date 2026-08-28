import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    api.get('/messaging/conversations').then(setConversations).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensajes</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.requestId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#666" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.name}>{item.lastMessage?.sender?.displayName || 'Usuario'}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage?.content}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>Sin conversaciones</Text>
            <Text style={styles.emptySubtext}>Los mensajes apareceran cuando interactues con una solicitud</Text>
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
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  lastMsg: { color: '#888', fontSize: 13 },
  unreadBadge: { backgroundColor: '#4ecdc4', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  unreadText: { color: '#000', fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 16, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});
