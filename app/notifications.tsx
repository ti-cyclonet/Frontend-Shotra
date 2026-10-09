import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../src/context/NotificationsContext';
import { useGlass } from '../src/context/ThemeProvider';
import { confirmDialog } from '../src/services/dialog';
import { useNav, headerTop } from '../src/web/nav';
import { BrowserPermission, browserPermission, requestBrowserPermission } from '../src/web/browserNotify';

const ICON_BY_TYPE: Record<string, any> = {
  NEW_PROPOSAL: 'paper-plane',
  PROPOSAL_ACCEPTED: 'checkmark-circle',
  PROPOSAL_REJECTED: 'close-circle',
  CONTRACT_SIGNED: 'create',
  CONTRACT_COMPLETED: 'checkmark-done',
  NEW_RATING: 'star',
  RATING_REVEALED: 'star-half',
  NEW_MESSAGE: 'chatbubble-ellipses',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export default function NotificationsScreen() {
  const nav = useNav();
  const { items, markRead, markAllRead, clearAll } = useNotifications();
  const glass = useGlass();
  const theme = glass.theme;
  // Avisos del navegador (solo web; 'unsupported' en el celular, donde hay push)
  const [webPermission, setWebPermission] = useState<BrowserPermission>(browserPermission());
  const enableWebAlerts = async () => setWebPermission(await requestBrowserPermission());

  const open = (n: any) => {
    if (!n.read) markRead(n.id);
    if (n.entityType === 'chat' && n.entityId) nav.open(`/chat/${n.entityId}`);
    else if (n.entityType === 'contract' && n.entityId) nav.open(`/contract/${n.entityId}`);
    else if (n.entityType === 'request' && n.entityId) nav.open(`/request/${n.entityId}`);
  };

  const handleClearAll = async () => {
    const ok = await confirmDialog('Vaciar notificaciones', 'Se eliminarán todas tus notificaciones. Esta acción no se puede deshacer.', 'Vaciar');
    if (ok) clearAll();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => nav.back('/(tabs)/feed')}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notificaciones</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[styles.markAll, { color: theme.accent }]}>Marcar leidas</Text>
          </TouchableOpacity>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {webPermission === 'default' && (
        <View style={[styles.webAlert, glass.card]}>
          <Ionicons name="notifications-outline" size={22} color={theme.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Avisos en este navegador</Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>Te avisamos de mensajes y ofertas nuevas aunque estés en otra pestaña.</Text>
          </View>
          <TouchableOpacity style={[styles.webAlertBtn, { backgroundColor: theme.accent }]} onPress={enableWebAlerts}>
            <Text style={[styles.webAlertBtnText, { color: theme.accentText }]}>Activar</Text>
          </TouchableOpacity>
        </View>
      )}
      {webPermission === 'denied' && (
        <Text style={[styles.webAlertDenied, { color: theme.textMuted }]}>
          Los avisos de este navegador están bloqueados. Puedes activarlos desde el candado de la barra de direcciones.
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, glass.card, !item.read && { borderColor: theme.accent, backgroundColor: theme.glassStrong }]}
            onPress={() => open(item)}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.read ? theme.glass : theme.accent }]}>
              <Ionicons name={ICON_BY_TYPE[item.type] || 'notifications'} size={20} color={item.read ? theme.textMuted : theme.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.body, { color: theme.textMuted }]} numberOfLines={2}>{item.body}</Text>
              <Text style={[styles.time, { color: theme.textMuted }]}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No tienes notificaciones</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: headerTop(52) },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  markAll: { fontSize: 13, fontWeight: '700' },
  list: { padding: 16, paddingTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, marginTop: 2 },
  time: { fontSize: 11, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  webAlert: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  webAlertBtn: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  webAlertBtnText: { fontWeight: '800', fontSize: 13 },
  webAlertDenied: { fontSize: 12, marginHorizontal: 16, marginBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 15, marginTop: 16, fontWeight: '600' },
});
