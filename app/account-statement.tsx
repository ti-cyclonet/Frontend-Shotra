import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../src/services/api';
import { useGlass } from '../src/context/ThemeProvider';

interface Charge {
  id: string;
  contractId: string;
  contractCode?: string | null;
  serviceTitle?: string | null;
  grossAmount: number;
  ratePercent: number;
  commissionAmount: number;
  periodKey: string;
  status: 'ACCRUED' | 'INVOICED' | 'PAID' | 'WAIVED';
  invoicedPeriodKey?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

interface Statement {
  currentPeriodKey: string;
  accruedTotal: number;
  invoicedTotal: number;
  paidTotal: number;
  billingThreshold: number;
  charges: Charge[];
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  ACCRUED: { label: 'Por facturar', color: '#f39c12', icon: 'hourglass-outline' },
  INVOICED: { label: 'Facturada', color: '#3498db', icon: 'document-text-outline' },
  PAID: { label: 'Pagada', color: '#2ecc71', icon: 'checkmark-circle-outline' },
  WAIVED: { label: 'Anulada', color: '#888', icon: 'close-circle-outline' },
};

const money = (n: number) => `$${(n || 0).toLocaleString('es-CO')}`;

function periodLabel(key: string) {
  const [y, m] = key.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const idx = parseInt(m, 10) - 1;
  return `${months[idx] || m} ${y}`;
}

export default function AccountStatementScreen() {
  const glass = useGlass();
  const theme = glass.theme;
  const [data, setData] = useState<Statement | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Statement>('/commissions/statement');
      setData(res);
    } catch {
      // silencioso
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const accrued = data?.accruedTotal ?? 0;
  const threshold = data?.billingThreshold ?? 12000;
  const remaining = Math.max(0, threshold - accrued);
  const progress = Math.min(1, threshold > 0 ? accrued / threshold : 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/profile')}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Estado de cuenta</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={data?.charges ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        ListHeaderComponent={
          <View>
            {/* Resumen de saldos */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, glass.card]}>
                <Ionicons name="hourglass-outline" size={20} color="#f39c12" />
                <Text style={[styles.summaryValue, { color: theme.text }]}>{money(accrued)}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Por facturar</Text>
              </View>
              <View style={[styles.summaryCard, glass.card]}>
                <Ionicons name="document-text-outline" size={20} color="#3498db" />
                <Text style={[styles.summaryValue, { color: theme.text }]}>{money(data?.invoicedTotal ?? 0)}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Facturado</Text>
              </View>
              <View style={[styles.summaryCard, glass.card]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#2ecc71" />
                <Text style={[styles.summaryValue, { color: theme.text }]}>{money(data?.paidTotal ?? 0)}</Text>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Pagado</Text>
              </View>
            </View>

            {/* Progreso hacia el umbral de facturación */}
            <View style={[styles.thresholdCard, glass.card]}>
              <View style={styles.thresholdHeader}>
                <Ionicons name="receipt-outline" size={18} color={theme.accent} />
                <Text style={[styles.thresholdTitle, { color: theme.text }]}>Facturación mensual</Text>
              </View>
              <Text style={[styles.thresholdDesc, { color: theme.textMuted }]}>
                Tus comisiones se acumulan y se facturan cada mes cuando superan {money(threshold)}.
                {remaining > 0
                  ? ` Faltan ${money(remaining)} para tu próxima factura.`
                  : ' Alcanzaste el umbral: se facturará en el próximo corte.'}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.glassBorder }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
              </View>
              <Text style={[styles.periodTag, { color: theme.textMuted }]}>
                Periodo actual: {data ? periodLabel(data.currentPeriodKey) : '—'}
              </Text>
            </View>

            <Text style={[styles.listTitle, { color: theme.text }]}>Movimientos</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status] || STATUS_META.ACCRUED;
          return (
            <TouchableOpacity
              style={[styles.chargeCard, glass.card]}
              onPress={() => item.contractId && router.push(`/contract/${item.contractId}`)}
            >
              <View style={[styles.chargeIcon, { backgroundColor: meta.color + '22' }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.chargeTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.serviceTitle || item.contractCode || 'Servicio'}
                </Text>
                <Text style={[styles.chargeMeta, { color: theme.textMuted }]}>
                  Servicio {money(item.grossAmount)} · comisión {item.ratePercent}% · {periodLabel(item.periodKey)}
                </Text>
              </View>
              <View style={styles.chargeRight}>
                <Text style={[styles.chargeAmount, { color: theme.text }]}>{money(item.commissionAmount)}</Text>
                <View style={[styles.statusPill, { backgroundColor: meta.color + '22' }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Aún no tienes comisiones</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Al completar servicios como ofertante, aquí verás tus comisiones.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 52 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  list: { padding: 16, paddingTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 15, fontWeight: '800' },
  summaryLabel: { fontSize: 11, textAlign: 'center' },
  thresholdCard: { borderRadius: 16, padding: 16, marginBottom: 18 },
  thresholdHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  thresholdTitle: { fontSize: 15, fontWeight: '700' },
  thresholdDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  periodTag: { fontSize: 12, marginTop: 10 },
  listTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  chargeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
  chargeIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  chargeTitle: { fontSize: 14, fontWeight: '700' },
  chargeMeta: { fontSize: 12, marginTop: 3 },
  chargeRight: { alignItems: 'flex-end', gap: 4 },
  chargeAmount: { fontSize: 15, fontWeight: '800' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, marginTop: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
});
