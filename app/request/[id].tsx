import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { confirmDialog, alertDialog } from '../../src/services/dialog';
import { useGlass } from '../../src/context/ThemeProvider';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const glass = useGlass();
  const theme = glass.theme;
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [myProfileId, setMyProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      api.get(`/requests/${id}`)
        .then(setRequest)
        .catch(() => alertDialog('Error', 'No se pudo cargar la solicitud'))
        .finally(() => setLoading(false));
    }
    // Obtener mi perfil para saber si soy el solicitante
    api.get('/profiles/me').then((p: any) => setMyProfileId(p?.id)).catch(() => {});
  }, [id]);

  const acceptProposal = async (proposalId: string) => {
    const ok = await confirmDialog(
      'Aceptar propuesta',
      'Al aceptar, las demas propuestas seran rechazadas automaticamente.',
      'Aceptar',
    );
    if (!ok) return;
    try {
      const res: any = await api.patch(`/proposals/${proposalId}/accept`, {});
      const updated = await api.get(`/requests/${id}`);
      setRequest(updated);
      if (res?.contractId) {
        const goContract = await confirmDialog(
          'Propuesta aceptada',
          `Contrato ${res.contractCode || ''} generado. Ya puedes firmarlo.`,
          'Ver contrato',
          'Mas tarde',
        );
        if (goContract) router.push(`/contract/${res.contractId}`);
      } else {
        alertDialog('Propuesta aceptada', 'Se genero el contrato de servicio.');
      }
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo aceptar');
    }
  };

  const rejectProposal = async (proposalId: string) => {
    const ok = await confirmDialog('Rechazar propuesta', 'Seguro que deseas rechazar esta propuesta?', 'Rechazar');
    if (!ok) return;
    try {
      await api.patch(`/proposals/${proposalId}/reject`, {});
      const updated = await api.get(`/requests/${id}`);
      setRequest(updated);
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo rechazar');
    }
  };

  const submitProposal = async () => {
    if (!price || !description) {
      alertDialog('Campos requeridos', 'Ingresa el precio y una descripcion de tu propuesta');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/proposals', {
        requestId: id,
        price: parseFloat(price),
        description,
        estimatedTime: estimatedTime || undefined,
      });
      alertDialog('Propuesta enviada', 'El solicitante revisara tu propuesta y te notificara.');
      setShowProposalForm(false);
      // Recargar para ver la propuesta en la lista
      const updated = await api.get(`/requests/${id}`);
      setRequest(updated);
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo enviar la propuesta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><Text style={[styles.loadingText, { color: theme.textMuted }]}>Cargando...</Text></View>;
  }

  if (!request) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><Text style={[styles.loadingText, { color: theme.textMuted }]}>Solicitud no encontrada</Text></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      {/* Header con botón volver */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/feed')}>
        <Ionicons name="arrow-back" size={22} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>Volver</Text>
      </TouchableOpacity>

      {/* Detalle de la solicitud */}
      <View style={[styles.card, glass.card]}>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryBadge, glass.chip]}>
            <Text style={[styles.categoryText, { color: theme.text }]}>{request.category?.name}</Text>
          </View>
          {request.isUrgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={12} color="#fff" />
              <Text style={styles.urgentText}>Urgente</Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{request.title}</Text>
        <Text style={[styles.description, { color: theme.textMuted }]}>{request.description}</Text>

        {request.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={theme.textMuted} />
            <Text style={[styles.infoText, { color: theme.textMuted }]}>{request.address}</Text>
          </View>
        )}

        {(request.budgetMin || request.budgetMax) && (
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={16} color={theme.accent} />
            <Text style={[styles.budgetText, { color: theme.accent }]}>
              {request.budgetMin && request.budgetMax
                ? `$${request.budgetMin.toLocaleString()} - $${request.budgetMax.toLocaleString()}`
                : `$${(request.budgetMin || request.budgetMax)?.toLocaleString()}`
              } COP
            </Text>
          </View>
        )}

        <View style={[styles.requesterRow, { borderTopColor: theme.glassBorder }]}>
          <View style={[styles.avatarSmall, glass.chip]}>
            <Ionicons name="person" size={14} color={theme.textMuted} />
          </View>
          <Text style={[styles.requesterName, { color: theme.text }]}>{request.requester?.displayName}</Text>
          {request.requester?.averageRating > 0 && (
            <Text style={styles.rating}>★ {request.requester.averageRating.toFixed(1)}</Text>
          )}
        </View>
      </View>

      {/* Contrato generado */}
      {request.contract && (
        <TouchableOpacity style={[styles.contractButton, { backgroundColor: theme.success }]} onPress={() => router.push(`/contract/${request.contract.id}`)}>
          <Ionicons name="document-text" size={18} color="#fff" />
          <Text style={[styles.contractButtonText, { color: '#fff' }]}>Ver contrato {request.contract.code}</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Propuestas existentes */}
      {request.proposals?.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Propuestas ({request.proposals.length})</Text>
          {request.proposals.map((p: any) => (
            <View key={p.id} style={[styles.proposalCard, glass.cardStrong]}>
              <View style={styles.proposalHeader}>
                <Text style={[styles.providerName, { color: theme.text }]}>{p.provider?.displayName}</Text>
                <Text style={[styles.proposalPrice, { color: theme.accent }]}>${p.price.toLocaleString()}</Text>
              </View>
              <Text style={[styles.proposalDesc, { color: theme.textMuted }]}>{p.description}</Text>
              {p.estimatedTime && <Text style={[styles.proposalTime, { color: theme.textMuted }]}>Tiempo: {p.estimatedTime}</Text>}
              {p.provider?.averageRating > 0 && (
                <Text style={styles.providerRating}>★ {p.provider.averageRating.toFixed(1)} · {p.provider.completedJobs} trabajos</Text>
              )}
              {/* Botones aceptar/rechazar (solo para el solicitante, propuestas pendientes) */}
              {myProfileId === request.requester?.id && p.status === 'PENDING' && (
                <View style={styles.proposalActions}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectProposal(p.id)}>
                    <Text style={styles.rejectBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: theme.accent }]} onPress={() => acceptProposal(p.id)}>
                    <Text style={[styles.acceptBtnText, { color: theme.accentText }]}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {p.status === 'ACCEPTED' && (
                <View style={styles.acceptedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                  <Text style={[styles.acceptedText, { color: theme.accent }]}>Aceptada</Text>
                </View>
              )}
              {p.status === 'REJECTED' && (
                <View style={styles.rejectedBadge}>
                  <Text style={styles.rejectedText}>Rechazada</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Botón para enviar propuesta (solo si sigue abierta a propuestas y no soy el solicitante) */}
      {!showProposalForm
        && !request.contract
        && myProfileId !== request.requester?.id
        && ['PUBLISHED', 'IN_PROPOSALS'].includes(request.status) && (
        <TouchableOpacity style={[styles.proposalButton, { backgroundColor: theme.accent }]} onPress={() => setShowProposalForm(true)}>
          <Ionicons name="paper-plane" size={18} color={theme.accentText} />
          <Text style={[styles.proposalButtonText, { color: theme.accentText }]}>Enviar propuesta</Text>
        </TouchableOpacity>
      )}

      {/* Formulario de propuesta */}
      {showProposalForm && (
        <View style={[styles.formSection, glass.card, { borderColor: theme.accent }]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Tu propuesta</Text>

          <Text style={[styles.label, { color: theme.textMuted }]}>Precio (COP) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]}
            value={price}
            onChangeText={setPrice}
            placeholder="Ej: 12000"
            placeholderTextColor={theme.inputPlaceholder}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: theme.textMuted }]}>Descripcion de tu propuesta *</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Explica por que eres la mejor opcion..."
            placeholderTextColor={theme.inputPlaceholder}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: theme.textMuted }]}>Tiempo estimado</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]}
            value={estimatedTime}
            onChangeText={setEstimatedTime}
            placeholder="Ej: 45 minutos"
            placeholderTextColor={theme.inputPlaceholder}
          />

          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.border }]} onPress={() => setShowProposalForm(false)}>
              <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.accent }]} onPress={submitProposal} disabled={submitting}>
              <Text style={[styles.submitButtonText, { color: theme.accentText }]}>{submitting ? 'Enviando...' : 'Enviar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 50 },
  loadingText: { textAlign: 'center', marginTop: 100 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 16, padding: 20, marginBottom: 20 },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgentText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 14 },
  budgetText: { fontSize: 16, fontWeight: '700' },
  requesterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  requesterName: { fontSize: 14, fontWeight: '500' },
  rating: { color: '#f39c12', fontSize: 13 },
  // Proposals
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  proposalCard: { borderRadius: 12, padding: 14, marginBottom: 10 },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  providerName: { fontSize: 14, fontWeight: '600' },
  proposalPrice: { fontSize: 16, fontWeight: '800' },
  proposalDesc: { fontSize: 13, marginBottom: 4 },
  proposalTime: { fontSize: 12 },
  providerRating: { color: '#f39c12', fontSize: 12, marginTop: 4 },
  // CTA
  proposalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 16, marginBottom: 20 },
  proposalButtonText: { fontSize: 16, fontWeight: '800' },
  contractButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 16, marginBottom: 20 },
  contractButtonText: { fontSize: 15, fontWeight: '800' },
  // Form
  formSection: { borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1 },
  formTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1 },
  textArea: { height: 80 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
  submitButton: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center' },
  submitButtonText: { fontSize: 14, fontWeight: '800' },
  // Accept/Reject
  proposalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  rejectBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#dc2626', alignItems: 'center' },
  rejectBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  acceptBtn: { flex: 2, padding: 10, borderRadius: 8, alignItems: 'center' },
  acceptBtnText: { fontSize: 13, fontWeight: '800' },
  acceptedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  acceptedText: { fontSize: 12, fontWeight: '700' },
  rejectedBadge: { marginTop: 8 },
  rejectedText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
});
