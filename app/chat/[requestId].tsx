import {
  View, FlatList, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { alertDialog, confirmDialog } from '../../src/services/dialog';
import { useGlass } from '../../src/context/ThemeProvider';
import { useChat } from '../../src/context/ChatContext';
import { Text, Input, spacing, radius } from '../../src/components/ui';

interface Message {
  id: string;
  requestId: string;
  senderId: string;
  content: string;
  type: string;
  createdAt: string;
  sender?: { id?: string; displayName?: string; avatarUrl?: string };
}

/** Chat con una persona: todos los servicios entre los dos (ver MessagingService del backend). */
interface Thread {
  otherParty: { id: string; displayName: string; avatarUrl?: string } | null;
  /** Hay un servicio en curso: se puede escribir. Si no, el chat es de solo lectura. */
  canSend: boolean;
  /** Contrato al que van los mensajes nuevos. */
  activeRequestId: string | null;
  requests: { id: string; title: string; status: string | null }[];
  messages: Message[];
}

/** Fila del chat: un mensaje o un separador al cambiar de servicio. */
type Row = { kind: 'separator'; key: string; title: string } | { kind: 'message'; key: string; message: Message };

const POLL_INTERVAL_MS = 4000;

export default function ChatScreen() {
  // El chat se abre desde cualquiera de las solicitudes con esa persona
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const glass = useGlass();
  const theme = glass.theme;
  const listRef = useRef<FlatList>(null);
  const { refresh: refreshChatBadge } = useChat();

  const [thread, setThread] = useState<Thread | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!requestId) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get<Thread>(`/messaging/${requestId}/thread`);
      setThread(res);
      setError(null);
      // getThread marca como leídos en el backend: refrescar el badge ya
      refreshChatBadge();
    } catch (err: any) {
      if (!silent) setError(err.message || 'No se pudo cargar el chat');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [requestId, refreshChatBadge]);

  useFocusEffect(
    useCallback(() => {
      api.get('/profiles/me').then((p: any) => setMyProfileId(p?.id)).catch(() => {});
      load();
      const interval = setInterval(() => load(true), POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [load]),
  );

  // Separador cada vez que cambia el servicio (solicitud) de los mensajes
  const rows = useMemo<Row[]>(() => {
    if (!thread) return [];
    const titles = new Map(thread.requests.map((r) => [r.id, r.title]));
    const out: Row[] = [];
    let current: string | null = null;
    for (const m of thread.messages) {
      if (m.requestId !== current) {
        current = m.requestId;
        out.push({ kind: 'separator', key: `sep-${m.id}`, title: titles.get(m.requestId) || 'Servicio' });
      }
      out.push({ kind: 'message', key: m.id, message: m });
    }
    return out;
  }, [thread]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending || !thread?.canSend) return;
    setSending(true);
    setText('');
    try {
      // Va al contrato activo con esta persona (el backend lo resuelve igual)
      await api.post<Message>('/messaging', { requestId: thread.activeRequestId || requestId, content, type: 'TEXT' });
      await load(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err: any) {
      setText(content);
      alertDialog('No se pudo enviar', err.message || 'Intenta de nuevo');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog(
      'Eliminar chat',
      thread?.canSend
        ? 'Se borrará el historial para ti (la otra persona lo conserva). Como tienen un servicio en curso, el chat seguirá disponible para los mensajes nuevos.'
        : 'Se borrará el historial para ti (la otra persona lo conserva). Si vuelven a tener un servicio, el chat reaparecerá.',
      'Eliminar',
      'Cancelar',
      'danger',
    );
    if (!ok) return;
    try {
      await api.delete(`/messaging/${requestId}`);
      refreshChatBadge();
      router.canGoBack() ? router.back() : router.push('/(tabs)/messages');
    } catch (err: any) {
      alertDialog('No se pudo eliminar', err.message || 'Intenta de nuevo');
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/messages')}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="h2" numberOfLines={1}>{thread?.otherParty?.displayName || 'Chat'}</Text>
          {thread && !thread.canSend && <Text variant="caption" muted>Solo lectura · trabajo finalizado</Text>}
        </View>
        {thread && (
          <TouchableOpacity style={styles.headerButton} onPress={handleDelete} accessibilityLabel="Eliminar chat">
            <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text variant="body" muted style={{ marginTop: spacing[3], textAlign: 'center', paddingHorizontal: spacing[6] }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textMuted} />
              <Text variant="body" muted style={{ marginTop: spacing[3], textAlign: 'center' }}>
                {thread?.canSend ? 'Todavía no hay mensajes. Escribe el primero.' : 'No hay mensajes en este chat.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === 'separator') {
              return (
                <View style={styles.separator}>
                  <View style={[styles.separatorLine, { backgroundColor: theme.glassBorder }]} />
                  <Text variant="caption" muted numberOfLines={1} style={styles.separatorText}>{item.title}</Text>
                  <View style={[styles.separatorLine, { backgroundColor: theme.glassBorder }]} />
                </View>
              );
            }
            const m = item.message;
            const isMine = m.senderId === myProfileId;
            return (
              <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View
                  style={[
                    styles.bubble,
                    isMine
                      ? { backgroundColor: theme.accent, borderBottomRightRadius: 4 }
                      : { backgroundColor: theme.glass, borderColor: theme.glassBorder, borderWidth: 1, borderBottomLeftRadius: 4 },
                  ]}
                >
                  <Text style={{ color: isMine ? theme.accentText : theme.text }}>{m.content}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {thread && (thread.canSend ? (
        <View style={[styles.inputBar, { borderTopColor: theme.glassBorder }]}>
          <Input
            containerStyle={{ flex: 1 }}
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje..."
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.accent, opacity: text.trim() && !sending ? 1 : 0.5 }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? <ActivityIndicator color={theme.accentText} size="small" /> : <Ionicons name="send" size={18} color={theme.accentText} />}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.readOnlyBar, { borderTopColor: theme.glassBorder }]}>
          <Ionicons name="lock-closed-outline" size={16} color={theme.textMuted} />
          <Text variant="caption" muted style={{ flex: 1 }}>
            Chat de solo lectura: el trabajo fue finalizado. Se habilita de nuevo si vuelven a tener un servicio en curso.
          </Text>
        </View>
      ))}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 52, gap: 8 },
  headerButton: { padding: 4 },
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[4], flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing[6] },
  separator: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginVertical: spacing[3] },
  separatorLine: { flex: 1, height: 1 },
  separatorText: { maxWidth: '70%', textAlign: 'center' },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing[2] },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: spacing[4], borderTopWidth: 1 },
  readOnlyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing[4], borderTopWidth: 1 },
  sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
