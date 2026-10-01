import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Criterios de evaluación por rol del evaluado (deben coincidir con
 * Backend_Shotra/src/ratings/reputation.ts).
 */
export const RATING_CRITERIA = {
  PROVIDER: [
    { key: 'quality', label: 'Calidad del trabajo' },
    { key: 'punctuality', label: 'Puntualidad y cumplimiento de tiempos' },
    { key: 'communication', label: 'Comunicación' },
    { key: 'priceFairness', label: 'Respetó el precio cotizado' },
  ],
  REQUESTER: [
    { key: 'clarity', label: 'Lo descrito coincidió con la realidad' },
    { key: 'payment', label: 'Pagó completo y a tiempo' },
    { key: 'respect', label: 'Trato y respeto' },
    { key: 'access', label: 'Facilitó el acceso y las condiciones' },
  ],
} as const;

export type RatingRole = keyof typeof RATING_CRITERIA;

/** Etiqueta corta de cada criterio para resúmenes. */
export const CRITERIA_SHORT: Record<string, string> = {
  quality: 'Calidad',
  punctuality: 'Puntual',
  communication: 'Comunicación',
  priceFairness: 'Precio justo',
  clarity: 'Claridad',
  payment: 'Pago',
  respect: 'Trato',
  access: 'Condiciones',
};

export const REPEAT_QUESTION: Record<RatingRole, string> = {
  PROVIDER: '¿Lo volverías a contratar?',
  REQUESTER: '¿Le volverías a trabajar?',
};

export interface Reputation {
  rating: number;
  count: number;
  repeatRate: number | null;
  criteria: Record<string, number>;
  badges: string[];
}

const fmt = (n: number) => n.toFixed(1).replace('.', ',');

/**
 * Línea de reputación: "★ 4,8 (40) · 95% lo recontratarían", el criterio
 * mejor y peor calificados, e insignias.
 */
export function ReputationLine({
  reputation,
  role,
  completedJobs,
  mutedColor,
  showCriteria = true,
}: {
  reputation?: Reputation | null;
  role: RatingRole;
  completedJobs?: number;
  mutedColor: string;
  showCriteria?: boolean;
}) {
  if (!reputation || reputation.count === 0) {
    const jobs = completedJobs ? ` · ${completedJobs} trabajo${completedJobs === 1 ? '' : 's'}` : '';
    return <Text style={[styles.muted, { color: mutedColor }]}>Sin evaluaciones aún{jobs}</Text>;
  }
  const parts = [`★ ${fmt(reputation.rating)} (${reputation.count})`];
  if (completedJobs) parts.push(`${completedJobs} trabajo${completedJobs === 1 ? '' : 's'}`);
  if (reputation.repeatRate !== null && reputation.repeatRate !== undefined) {
    parts.push(`${Math.round(reputation.repeatRate * 100)}% ${role === 'PROVIDER' ? 'lo recontratarían' : 'le volverían a trabajar'}`);
  }
  const criteria = RATING_CRITERIA[role]
    .map((c) => ({ key: c.key as string, value: reputation.criteria?.[c.key] }))
    .filter((c): c is { key: string; value: number } => typeof c.value === 'number');

  return (
    <View>
      <Text style={styles.main}>{parts.join(' · ')}</Text>
      {showCriteria && criteria.length > 0 && (
        <Text style={[styles.muted, { color: mutedColor }]}>
          {criteria.map((c) => `${CRITERIA_SHORT[c.key]} ${fmt(c.value)}`).join(' · ')}
        </Text>
      )}
      {reputation.badges?.length > 0 && (
        <View style={styles.badges}>
          {reputation.badges.map((b) => (
            <View key={b} style={styles.badge}>
              <Ionicons name="ribbon" size={11} color="#b7791f" />
              <Text style={styles.badgeText}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  main: { color: '#f39c12', fontSize: 13, fontWeight: '700', marginTop: 6 },
  muted: { fontSize: 12, marginTop: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(243,156,18,0.14)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#b7791f', fontSize: 11, fontWeight: '700' },
});
