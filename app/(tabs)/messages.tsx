import { View, FlatList, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/context/ThemeProvider';
import { Text, PressableCard, IconChip, CountDot, spacing, radius } from '../../src/components/ui';

export default function MessagesScreen() {
  const { theme } = useTheme();
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    api.get('/messaging/conversations').then(setConversations).catch(() => {});
  }, []);

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
            <PressableCard padding={14} rounded={radius.xl} style={styles.card}>
              <IconChip icon="person" color="slate" size={46} rounded={radius.pill} />
              <View style={styles.cardContent}>
                <Text variant="bodyStrong">{item.lastMessage?.sender?.displayName || 'Usuario'}</Text>
                <Text variant="caption" muted numberOfLines={1} style={{ marginTop: 2 }}>{item.lastMessage?.content}</Text>
              </View>
              {item.unreadCount > 0 && <CountDot count={item.unreadCount} />}
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
  cardContent: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 100, paddingHorizontal: spacing[6] },
});
