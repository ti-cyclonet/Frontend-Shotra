import { View, FlatList, StyleSheet } from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/context/ThemeProvider';
import { Text, PressableCard, IconChip, CountDot, spacing, radius } from '../../src/components/ui';

const POLL_INTERVAL_MS = 5000;

export default function MessagesScreen() {
  const { theme } = useTheme();
  const [conversations, setConversations] = useState<any[]>([]);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(() => {
    // El backend ya devuelve las conversaciones ordenadas de la más
    // reciente a la más antigua (por lastMessage.createdAt).
    api.get('/messaging/conversations').then(setConversations).catch(() => {});
  }, []);

  // Mientras la pantalla está enfocada, refresca cada 5s (silencioso, sin
  // spinner) para reflejar mensajes nuevos y reordenar la lista casi en
  // tiempo real. Se detiene al salir de la pantalla.
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      pollTimer.current = setInterval(loadConversations, POLL_INTERVAL_MS);
      return () => {
        if (pollTimer.current) {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
      };
    }, [loadConversations]),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text variant="sectionLabel" muted>Shotra</Text>
        <Text variant="h1">Mensajes</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.requestId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 55).springify().damping(16)}>
            <PressableCard
              padding={14}
              rounded={radius.xl}
              style={[styles.card, item.closed && styles.cardClosed]}
              disabled={item.closed}
              onPress={() => { if (!item.closed) router.push(`/chat/${item.requestId}`); }}
            >
              <IconChip icon="person" color="slate" size={46} rounded={radius.pill} />
              <View style={styles.cardContent}>
                <Text variant="bodyStrong">{item.otherParty?.displayName || 'Usuario'}</Text>
                <Text variant="caption" muted numberOfLines={1} style={{ marginTop: 2 }}>
                  {item.closed ? 'Trabajo finalizado' : item.lastMessage?.content}
                </Text>
              </View>
              {!item.closed && item.unreadCount > 0 && <CountDot count={item.unreadCount} />}
            </PressableCard>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconChip icon="chatbubbles-outline" color="neutral" size={64} rounded={radius['2xl']} />
            <Text variant="h2" style={{ marginTop: spacing[4] }}>Sin conversaciones</Text>
            <Text variant="body" muted style={{ marginTop: 6, textAlign: 'center' }}>Los mensajes apareceran cuando interactues con una solicitud</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[5], paddingTop: 60, paddingBottom: spacing[3] },
  list: { paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: 120 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  cardClosed: { opacity: 0.5 },
  cardContent: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 100, paddingHorizontal: spacing[6] },
});
