import {
  View, FlatList, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { alertDialog } from '../../src/services/dialog';
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

const POLL_INTERVAL_MS = 4000;

export default function ChatScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const glass = useGlass();
  const theme = glass.theme;
  const listRef = useRef<FlatList>(null);
  const { refresh: refreshChatBadge } = useChat();

  const [messages, setMessages] = useState<Message[]>([]);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [requestTitle, setRequestTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [closed, setClosed] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!requestId) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get<Message[]>(`/messaging/${requestId}`);
      setMessages(res);
      // getMessages marca como leidos en el backend: refrescar el badge ya.
      refreshChatBadge();
    } catch (err: any) {
      if (err.message?.includes('finalizado')) {
        setClosed(true);
      } else if (!silent) {
        alertDialog('No se pudo cargar el chat', err.message || 'Intenta de nuevo');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [requestId, refreshChatBadge]);

  useFocusEffect(
    useCallback(() => {
      api.get('/profiles/me').then((p: any) => setMyProfileId(p?.id)).catch(() => {});
      api.get(`/requests/${requestId}`).then((r: any) => setRequestTitle(r?.title || null)).catch(() => {});
      load();

      const interval = setInterval(() => {
        if (!closed) load(true);
      }, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [requestId, load, closed]),
  );

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending || closed) return;

    setSending(true);
    setText('');
    try {
      const sent = await api.post<Message>('/messaging', { requestId, content, type: 'TEXT' });
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err: any) {
      setText(content);
      alertDialog('No se pudo enviar', err.message || 'Intenta de nuevo');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/messages')}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="h2" numberOfLines={1}>{requestTitle || 'Chat'}</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : closed ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.textMuted} />
          <Text variant="body" muted style={{ marginTop: spacing[3], textAlign: 'center', paddingHorizontal: spacing[6] }}>
            Este chat ya no está disponible: el trabajo fue finalizado.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textMuted} />
              <Text variant="body" muted style={{ marginTop: spacing[3], textAlign: 'center' }}>
                Todavía no hay mensajes. Escribe el primero.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.senderId === myProfileId;
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
                  {!isMine && item.sender?.displayName && (
                    <Text variant="caption" style={{ color: theme.accent, fontWeight: '700', marginBottom: 2 }}>
                      {item.sender.displayName}
                    </Text>
                  )}
                  <Text style={{ color: isMine ? theme.accentText : theme.text }}>{item.content}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {!closed && (
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
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 52, gap: 8 },
  backButton: { padding: 4 },
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[4], flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing[6] },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing[2] },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: spacing[4], borderTopWidth: 1 },
  sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
