import { View, FlatList, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/services/api';
import { confirmDialog, alertDialog } from '../../src/services/dialog';
import { useTheme } from '../../src/context/ThemeProvider';
import { Text, PressableCard, Badge, IconChip, Button, spacing, radius, typography } from '../../src/components/ui';

type Tab = 'requests' | 'proposals';

// Estados en los que una solicitud AÚN puede cancelarse (coincide con el backend).
const CANCELABLE = ['PUBLISHED', 'IN_PROPOSALS', 'DRAFT'];

// Mapea el estado a un color de chip semantico del design system
const statusChip: Record<string, 'teal' | 'amber' | 'green' | 'blue' | 'red' | 'neutral'> = {
  PUBLISHED: 'teal', IN_PROPOSALS: 'amber', ACCEPTED: 'green',
  IN_PROGRESS: 'blue', COMPLETED: 'blue', CANCELLED: 'red', EXPIRED: 'neutral',
  PENDING: 'amber', REJECTED: 'red', WITHDRAWN: 'neutral',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', WITHDRAWN: 'Retirada',
  PUBLISHED: 'Publicada', IN_PROPOSALS: 'Con propuestas', IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada', CANCELLED: 'Cancelada', EXPIRED: 'Vencida',
};

/** Vencida: archivada, o ya pasada de plazo aunque el servidor aún no la archive. */
const isExpired = (item: any) => item.status === 'EXPIRED' || !!item.expiredNow;

/** "Vence en 5 h" / "Vence en 2 días" para las publicaciones abiertas. */
function closesLabel(item: any): string | null {
  if (!item.closesAt || isExpired(item)) return null;
  const ms = new Date(item.closesAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.round(ms / 36e5);
  if (h < 1) return 'Vence en menos de 1 h';
  if (h < 48) return `Vence en ${h} h`;
  return `Vence en ${Math.round(h / 24)} días`;
}

// Estado del CONTRATO → chip + etiqueta (para reflejar el ciclo real de la
// propuesta aceptada, que el proposal.status no refleja porque se queda en ACCEPTED).
const contractChip: Record<string, 'teal' | 'amber' | 'green' | 'blue' | 'red' | 'purple' | 'neutral'> = {
  PENDING: 'amber', SIGNED: 'blue', IN_PROGRESS: 'blue',
  PENDING_CONFIRMATION: 'amber', COMPLETED: 'green', EVALUATED: 'purple',
  CANCELLED: 'red', DISPUTED: 'red',
};
const contractLabel: Record<string, string> = {
  PENDING: 'Pendiente de firma', SIGNED: 'En curso', IN_PROGRESS: 'En curso',
  PENDING_CONFIRMATION: 'Por confirmar', COMPLETED: 'Completada', EVALUATED: 'Finalizada',
  CANCELLED: 'Cancelada', DISPUTED: 'En disputa',
};

/** Estado a mostrar para una propuesta: si fue aceptada y ya hay contrato, se
 *  usa el estado del CONTRATO (más real); si no, el de la propuesta. */
function proposalDisplayStatus(item: any): { label: string; chip: 'teal' | 'amber' | 'green' | 'blue' | 'red' | 'purple' | 'neutral' } {
  const cStatus = item?.contract?.status;
  if (item?.status === 'ACCEPTED' && cStatus && contractLabel[cStatus]) {
    return { label: contractLabel[cStatus], chip: contractChip[cStatus] || 'neutral' };
  }
  return { label: statusLabel[item.status] || item.status, chip: statusChip[item.status] || 'neutral' };
}

export default function ActivityScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);

  const load = useCallback(() => {
    api.get('/requests/mine').then(setRequests).catch(() => {});
    api.get('/proposals/mine').then(setProposals).catch(() => {});
  }, []);

  // Auto-refresco cada 5s mientras la pantalla está enfocada (para ver nuevas
  // propuestas/estados casi en tiempo real). Se detiene al salir.
  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(() => { load(); }, 5000);
      return () => clearInterval(t);
    }, [load]),
  );

  const cancelRequest = useCallback(async (item: any) => {
    const ok = await confirmDialog(
      'Cancelar solicitud',
      `¿Seguro que quieres cancelar "${item.title}"? Dejará de recibir propuestas.`,
      'Sí, cancelar',
      'No',
      'danger',
    );
    if (!ok) return;
    try {
      await api.patch(`/requests/${item.id}/cancel`);
      await alertDialog('Solicitud cancelada', 'Tu solicitud fue cancelada.', 'success');
      load();
    } catch (e: any) {
      await alertDialog('No se pudo cancelar', e?.message || 'Intenta de nuevo.', 'danger');
    }
  }, [load]);

  const republish = useCallback(async (item: any) => {
    try {
      await api.patch(`/requests/${item.id}/republish`, {});
      await alertDialog('Publicada de nuevo', `"${item.title}" vuelve a recibir ofertas.`, 'success');
      load();
    } catch (e: any) {
      await alertDialog('No se pudo volver a publicar', e?.message || 'Intenta de nuevo.', 'danger');
    }
  }, [load]);

  const renderRequest = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 55).springify().damping(16)}>
      <PressableCard padding={16} rounded={radius['2xl']} onPress={() => router.push(`/request/${item.id}`)} style={styles.card}>
        <View style={styles.row}>
          <Text variant="cardTitle" style={{ flex: 1, marginRight: spacing[2] }} numberOfLines={1}>{item.title}</Text>
          <Badge
            label={isExpired(item) ? 'Vencida' : statusLabel[item.status] || item.status}
            color={isExpired(item) ? 'neutral' : statusChip[item.status] || 'neutral'}
          />
        </View>
        <Text variant="caption" muted style={{ marginTop: 4 }}>
          {item.category?.name}{closesLabel(item) ? ` · ${closesLabel(item)}` : ''}
        </Text>
        <View style={[styles.footerRow, { borderTopColor: theme.glassBorder }]}>
          <IconChip icon="people-outline" color="red" size={30} />
          <Text variant="captionStrong" color={theme.accent}>{item._count?.proposals || 0} propuestas recibidas</Text>
        </View>
        {isExpired(item) && !item.contract && (
          <Button
            label="Volver a publicar"
            variant="outline"
            size="sm"
            icon="refresh-outline"
            onPress={() => republish(item)}
            style={{ marginTop: spacing[3] }}
          />
        )}
        {CANCELABLE.includes(item.status) && !isExpired(item) && (
          <Button
            label="Cancelar solicitud"
            variant="outline"
            size="sm"
            icon="close-circle-outline"
            onPress={() => cancelRequest(item)}
            style={{ marginTop: spacing[3] }}
          />
        )}
      </PressableCard>
    </Animated.View>
  );

  const renderProposal = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 55).springify().damping(16)}>
      <PressableCard
        padding={16}
        rounded={radius['2xl']}
        onPress={() =>
          item.status === 'ACCEPTED' && item.contract?.id
            ? router.push(`/contract/${item.contract.id}`)
            : router.push(`/request/${item.requestId || item.request?.id}`)
        }
        style={styles.card}
      >
        <View style={styles.row}>
          <Text variant="cardTitle" style={{ flex: 1, marginRight: spacing[2] }} numberOfLines={1}>{item.request?.title}</Text>
          <Badge label={proposalDisplayStatus(item).label} color={proposalDisplayStatus(item).chip} />
        </View>
        <Text variant="caption" muted style={{ marginTop: 4 }}>{item.request?.category?.name}</Text>
        <View style={[styles.footerRow, { borderTopColor: theme.glassBorder }]}>
          <Text variant="captionStrong" color={theme.accent}>Mi oferta: ${item.price?.toLocaleString()}</Text>
          {item.status === 'ACCEPTED' && (
            <Text variant="captionStrong" color={theme.success}>
              {item.contract?.id ? 'Ver contrato →' : 'Te la aceptaron →'}
            </Text>
          )}
        </View>
      </PressableCard>
    </Animated.View>
  );

  const empty = (icon: any, title: string, sub: string) => (
    <View style={styles.empty}>
      <IconChip icon={icon} color="neutral" size={64} rounded={radius['2xl']} />
      <Text variant="h2" style={{ marginTop: spacing[4] }}>{title}</Text>
      <Text variant="body" muted style={{ marginTop: 6, textAlign: 'center' }}>{sub}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text variant="sectionLabel" muted>Shotra</Text>
        <Text variant="h1">Mi actividad</Text>
      </View>

      {/* Sub-tabs tipo pill */}
      <View style={styles.tabs}>
        <TabPill label={`Solicito (${requests.length})`} active={activeTab === 'requests'} onPress={() => setActiveTab('requests')} />
        <TabPill label={`Ofrezco (${proposals.length})`} active={activeTab === 'proposals'} onPress={() => setActiveTab('proposals')} />
      </View>

      {activeTab === 'requests' ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderRequest}
          ListEmptyComponent={empty('document-text-outline', 'No tienes solicitudes', 'Publica tu primera solicitud de servicio')}
        />
      ) : (
        <FlatList
          data={proposals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderProposal}
          ListEmptyComponent={empty('chatbubble-ellipses-outline', 'No has enviado propuestas', 'Explora solicitudes y envia tu propuesta')}
        />
      )}
    </View>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <PressableCard
      padding={false}
      rounded={radius.pill}
      strong={!active}
      onPress={onPress}
      style={[styles.tab, active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
    >
      <Text style={[typography.captionStrong, { color: active ? theme.accentText : theme.textMuted, paddingVertical: 10, textAlign: 'center' }]}>
        {label}
      </Text>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[5], paddingTop: 60, paddingBottom: spacing[3] },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing[5], gap: spacing[2], marginBottom: spacing[2] },
  tab: { flex: 1, alignItems: 'center' },
  list: { paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: 120 },
  card: { marginBottom: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2], marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1 },
  empty: { alignItems: 'center', paddingTop: 100, paddingHorizontal: spacing[6] },
});
