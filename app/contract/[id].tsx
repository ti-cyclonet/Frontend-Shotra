import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/services/api';
import { confirmDialog, alertDialog } from '../../src/services/dialog';
import { useGlass } from '../../src/context/ThemeProvider';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente de firma',
  SIGNED: 'Firmado - En progreso',
  IN_PROGRESS: 'En progreso',
  PENDING_CONFIRMATION: 'Por confirmar',
  COMPLETED: 'Completado',
  EVALUATED: 'Evaluado',
  DISPUTED: 'En disputa',
  CANCELLED: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f39c12',
  SIGNED: '#3498db',
  IN_PROGRESS: '#3498db',
  PENDING_CONFIRMATION: '#e67e22',
  COMPLETED: '#2ecc71',
  EVALUATED: '#9b59b6',
  DISPUTED: '#e74c3c',
  CANCELLED: '#e74c3c',
};

/** Selector de estrellas reutilizable */
function StarRating({ value, onChange, size = 30 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? '#f39c12' : '#555'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const glass = useGlass();
  const theme = glass.theme;
  const [contract, setContract] = useState<any>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Estado del formulario de evaluación
  const [score, setScore] = useState(0);
  const [quality, setQuality] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [comment, setComment] = useState('');

  // Estado del formulario de confirmación + declaración de pago
  const [payMethod, setPayMethod] = useState<string>('CASH');
  const [payVoucher, setPayVoucher] = useState('');   // URL en Cloudinary una vez subido
  const [payNote, setPayNote] = useState('');
  const [uploadingVoucher, setUploadingVoucher] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, me] = await Promise.all([
        api.get(`/contracts/${id}`),
        api.get('/profiles/me').catch(() => null),
      ]);
      setContract(c);
      setMyProfileId(me?.id ?? null);
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo cargar el contrato');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sign = async () => {
    setBusy(true);
    try {
      await api.patch(`/contracts/${id}/sign`, {});
      await load();
      alertDialog('Firma registrada', 'Tu firma quedo registrada en el contrato.');
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo firmar');
    } finally {
      setBusy(false);
    }
  };

  // Paso 1 (ofertante): marcar entregado
  const markDelivered = async () => {
    const ok = await confirmDialog(
      'Marcar como entregado',
      'Confirmas que ya entregaste el servicio? El solicitante deberá confirmar la recepción y el pago.',
      'Marcar entregado',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api.patch(`/contracts/${id}/deliver`, {});
      await load();
      alertDialog('Entrega registrada', 'Esperando que el solicitante confirme la recepción.');
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo marcar la entrega');
    } finally {
      setBusy(false);
    }
  };

  // Adjuntar comprobante: elegir imagen y subir a Cloudinary
  const pickVoucher = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const name = asset.fileName || `comprobante_${Date.now()}.jpg`;
      const type = asset.mimeType || 'image/jpeg';

      setUploadingVoucher(true);
      const res = await api.upload<{ url: string }>('/uploads/voucher', { uri: asset.uri, name, type });
      setPayVoucher(res.url);
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo subir el comprobante');
    } finally {
      setUploadingVoucher(false);
    }
  };

  // Paso 2 (solicitante): confirmar recepción + declarar pago
  const confirmReceipt = async () => {
    setBusy(true);
    try {
      await api.patch(`/contracts/${id}/confirm`, {
        method: payMethod,
        voucherUrl: payVoucher.trim() || undefined,
        note: payNote.trim() || undefined,
      });
      await load();
      alertDialog('Servicio confirmado', 'Registraste la recepción y el pago. Ahora pueden calificarse.');
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo confirmar la recepción');
    } finally {
      setBusy(false);
    }
  };

  const submitRating = async () => {
    if (score < 1) {
      alertDialog('Calificacion requerida', 'Selecciona al menos una estrella para la valoracion general.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/ratings', {
        contractId: id,
        score,
        quality: quality || undefined,
        punctuality: punctuality || undefined,
        communication: communication || undefined,
        comment: comment.trim() || undefined,
      });
      await load();
      alertDialog('Evaluacion enviada', 'Gracias por calificar el servicio.');
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo enviar la evaluacion');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><Text style={[styles.loadingText, { color: theme.textMuted }]}>Cargando...</Text></View>;
  }
  if (!contract) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><Text style={[styles.loadingText, { color: theme.textMuted }]}>Contrato no encontrado</Text></View>;
  }

  const isRequester = myProfileId === contract.requesterId;
  const isProvider = myProfileId === contract.providerId;
  const iSigned = isRequester ? !!contract.requesterSignedAt : isProvider ? !!contract.providerSignedAt : false;
  const bothSigned = !!contract.requesterSignedAt && !!contract.providerSignedAt;
  const providerName = contract.proposal?.provider?.displayName || 'Ofertante';
  const requesterName = contract.request?.requester?.displayName || 'Solicitante';
  const iAlreadyRated = Array.isArray(contract.ratings)
    && contract.ratings.some((r: any) => r.authorId === myProfileId);
  const canRate = (isRequester || isProvider)
    && ['COMPLETED', 'EVALUATED'].includes(contract.status)
    && !iAlreadyRated;
  const otherPartyName = isRequester ? providerName : requesterName;

  const isActive = ['SIGNED', 'IN_PROGRESS'].includes(contract.status);
  const isPendingConfirmation = contract.status === 'PENDING_CONFIRMATION';
  const payment = contract.paymentDeclaration;
  const PAY_METHODS = [
    { key: 'CASH', label: 'Efectivo', icon: 'cash-outline' },
    { key: 'TRANSFER', label: 'Transferencia', icon: 'swap-horizontal-outline' },
    { key: 'NEQUI', label: 'Nequi', icon: 'phone-portrait-outline' },
    { key: 'DAVIPLATA', label: 'Daviplata', icon: 'phone-portrait-outline' },
    { key: 'PSE', label: 'PSE', icon: 'card-outline' },
    { key: 'OTHER', label: 'Otro', icon: 'ellipsis-horizontal' },
  ];
  const payMethodLabel = (m: string) => PAY_METHODS.find((p) => p.key === m)?.label || m;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/feed')}>
        <Ionicons name="arrow-back" size={22} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>Volver</Text>
      </TouchableOpacity>

      {/* Encabezado del contrato */}
      <View style={[styles.card, glass.card]}>
        <View style={styles.row}>
          <Text style={[styles.code, { color: theme.accent }]}>{contract.code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[contract.status] || '#555' }]}>
            <Text style={styles.statusText}>{STATUS_LABEL[contract.status] || contract.status}</Text>
          </View>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{contract.request?.title}</Text>
        <Text style={[styles.category, { color: theme.textMuted }]}>{contract.request?.category?.name}</Text>

        <View style={styles.priceRow}>
          <Ionicons name="cash" size={18} color={theme.accent} />
          <Text style={[styles.price, { color: theme.accent }]}>${contract.agreedPrice?.toLocaleString()} {contract.currency || 'COP'}</Text>
        </View>
      </View>

      {/* Partes */}
      <View style={[styles.card, glass.card]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Partes del contrato</Text>
        <View style={styles.partyRow}>
          <View>
            <Text style={[styles.partyLabel, { color: theme.textMuted }]}>Solicitante</Text>
            <Text style={[styles.partyName, { color: theme.text }]}>{requesterName}</Text>
          </View>
          {contract.requesterSignedAt
            ? <View style={styles.signedTag}><Ionicons name="checkmark-circle" size={16} color="#2ecc71" /><Text style={styles.signedText}>Firmado</Text></View>
            : <Text style={styles.pendingText}>Sin firmar</Text>}
        </View>
        <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
        <View style={styles.partyRow}>
          <View>
            <Text style={[styles.partyLabel, { color: theme.textMuted }]}>Ofertante</Text>
            <Text style={[styles.partyName, { color: theme.text }]}>{providerName}</Text>
          </View>
          {contract.providerSignedAt
            ? <View style={styles.signedTag}><Ionicons name="checkmark-circle" size={16} color="#2ecc71" /><Text style={styles.signedText}>Firmado</Text></View>
            : <Text style={styles.pendingText}>Sin firmar</Text>}
        </View>
      </View>

      {/* Propuesta acordada */}
      {contract.proposal?.description && (
        <View style={[styles.card, glass.card]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Detalle acordado</Text>
          <Text style={[styles.proposalDesc, { color: theme.textMuted }]}>{contract.proposal.description}</Text>
          {contract.proposal.estimatedTime && (
            <Text style={[styles.proposalTime, { color: theme.textMuted }]}>Tiempo estimado: {contract.proposal.estimatedTime}</Text>
          )}
        </View>
      )}

      {/* Acciones */}
      {(isRequester || isProvider) && (
        <View style={styles.actions}>
          {contract.status === 'PENDING' && !iSigned && (
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent }]} onPress={sign} disabled={busy}>
              <Ionicons name="create" size={18} color={theme.accentText} />
              <Text style={[styles.primaryBtnText, { color: theme.accentText }]}>{busy ? 'Firmando...' : 'Firmar contrato'}</Text>
            </TouchableOpacity>
          )}
          {contract.status === 'PENDING' && iSigned && !bothSigned && (
            <View style={[styles.infoBox, glass.card]}>
              <Text style={[styles.infoText, { color: theme.textMuted }]}>Ya firmaste. Esperando la firma de la otra parte.</Text>
            </View>
          )}
          {/* Ofertante activo: puede marcar entregado */}
          {isActive && isProvider && (
            <TouchableOpacity style={[styles.completeBtn, { backgroundColor: theme.success }]} onPress={markDelivered} disabled={busy}>
              <Ionicons name="checkmark-done" size={18} color="#fff" />
              <Text style={[styles.primaryBtnText, { color: '#fff' }]}>{busy ? 'Procesando...' : 'Marcar como entregado'}</Text>
            </TouchableOpacity>
          )}
          {/* Ofertante ya entregó, espera confirmación */}
          {isPendingConfirmation && isProvider && (
            <View style={[styles.infoBox, glass.card]}>
              <Text style={[styles.infoText, { color: theme.textMuted }]}>Marcaste el servicio como entregado. Esperando que el solicitante confirme la recepción y el pago.</Text>
            </View>
          )}
          {['COMPLETED', 'EVALUATED'].includes(contract.status) && (
            <View style={styles.infoBoxSuccess}>
              <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
              <Text style={styles.infoTextSuccess}>Servicio completado y confirmado</Text>
            </View>
          )}
        </View>
      )}

      {/* Solicitante: confirmar recepción + declarar pago (cuando activo o pendiente de confirmación) */}
      {isRequester && (isActive || isPendingConfirmation) && (
        <View style={[styles.card, glass.card]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Confirmar recepción y pago</Text>
          <Text style={[styles.proposalDesc, { color: theme.textMuted, marginBottom: 14 }]}>
            Confirma que recibiste el servicio y registra cómo pagaste ${contract.agreedPrice?.toLocaleString()} {contract.currency || 'COP'} al ofertante.
          </Text>

          <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Método de pago</Text>
          <View style={styles.payMethods}>
            {PAY_METHODS.map((m) => {
              const sel = payMethod === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.payChip, glass.chip, sel && { borderColor: theme.accent, backgroundColor: theme.accent + '1a' }]}
                  onPress={() => setPayMethod(m.key)}
                >
                  <Ionicons name={m.icon as any} size={15} color={sel ? theme.accent : theme.textMuted} />
                  <Text style={[styles.payChipText, { color: sel ? theme.accent : theme.textMuted }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Comprobante (opcional)</Text>
          {payVoucher ? (
            <View style={[styles.voucherAttached, glass.chip]}>
              <Ionicons name="document-attach" size={18} color="#2ecc71" />
              <Text style={[styles.voucherText, { color: theme.text }]} numberOfLines={1}>Comprobante adjunto</Text>
              <TouchableOpacity onPress={() => setPayVoucher('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.attachBtn, glass.chip]}
              onPress={pickVoucher}
              disabled={uploadingVoucher}
            >
              {uploadingVoucher ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={18} color={theme.accent} />
              )}
              <Text style={[styles.attachBtnText, { color: theme.textMuted }]}>
                {uploadingVoucher ? 'Subiendo...' : 'Adjuntar comprobante'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Observación (opcional)</Text>
          <TextInput
            style={[styles.textArea, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }]}
            value={payNote}
            onChangeText={setPayNote}
            placeholder="Alguna nota sobre el pago o el servicio..."
            placeholderTextColor={theme.inputPlaceholder}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: theme.success, marginTop: 16 }]} onPress={confirmReceipt} disabled={busy}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>{busy ? 'Confirmando...' : 'Confirmar recepción y pago'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Registro de pago declarado (visible tras confirmar) */}
      {payment && (
        <View style={[styles.card, glass.card]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Pago declarado</Text>
          <View style={styles.partyRow}>
            <Text style={[styles.partyLabel, { color: theme.textMuted }]}>Método</Text>
            <Text style={[styles.partyName, { color: theme.text }]}>{payMethodLabel(payment.method)}</Text>
          </View>
          <View style={[styles.partyRow, { marginTop: 8 }]}>
            <Text style={[styles.partyLabel, { color: theme.textMuted }]}>Monto</Text>
            <Text style={[styles.partyName, { color: theme.accent }]}>${payment.amount?.toLocaleString()} {payment.currency || 'COP'}</Text>
          </View>
          {payment.note ? (
            <Text style={[styles.proposalDesc, { color: theme.textMuted, marginTop: 10 }]}>{payment.note}</Text>
          ) : null}
          {payment.voucherUrl ? (
            <Text style={[styles.proposalTime, { color: theme.accent, marginTop: 8 }]}>Comprobante adjunto</Text>
          ) : null}
        </View>
      )}

      {/* Formulario de evaluacion (doble via, tras completar) */}
      {canRate && (
        <View style={[styles.card, glass.card]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Califica a {otherPartyName}</Text>

          <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Valoracion general *</Text>
          <StarRating value={score} onChange={setScore} />

          <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Calidad del servicio</Text>
          <StarRating value={quality} onChange={setQuality} size={24} />

          <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Puntualidad</Text>
          <StarRating value={punctuality} onChange={setPunctuality} size={24} />

          <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Comunicacion</Text>
          <StarRating value={communication} onChange={setCommunication} size={24} />

          <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>Comentario</Text>
          <TextInput
            style={[styles.textArea, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }]}
            value={comment}
            onChangeText={setComment}
            placeholder="Cuentanos como fue tu experiencia..."
            placeholderTextColor={theme.inputPlaceholder}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity style={[styles.rateBtn, { backgroundColor: theme.warning }]} onPress={submitRating} disabled={busy}>
            <Ionicons name="star" size={18} color="#fff" />
            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>{busy ? 'Enviando...' : 'Enviar evaluacion'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ya evaluado por mi */}
      {(isRequester || isProvider) && ['COMPLETED', 'EVALUATED'].includes(contract.status) && iAlreadyRated && (
        <View style={styles.infoBoxSuccess}>
          <Ionicons name="star" size={18} color="#2ecc71" />
          <Text style={styles.infoTextSuccess}>Ya calificaste este servicio</Text>
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
  backText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 16, padding: 18, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  code: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  category: { fontSize: 13, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 18, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  partyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partyLabel: { fontSize: 12 },
  partyName: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  signedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signedText: { color: '#16a34a', fontSize: 13, fontWeight: '700' },
  pendingText: { color: '#d97706', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 12 },
  proposalDesc: { fontSize: 14, lineHeight: 20 },
  proposalTime: { fontSize: 13, marginTop: 8 },
  actions: { marginTop: 4, marginBottom: 30 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 16 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 16 },
  primaryBtnText: { fontSize: 16, fontWeight: '800' },
  infoBox: { borderRadius: 12, padding: 16 },
  infoText: { fontSize: 14, textAlign: 'center' },
  infoBoxSuccess: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(22,163,74,0.12)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#16a34a', marginBottom: 16 },
  infoTextSuccess: { color: '#16a34a', fontSize: 15, fontWeight: '700' },
  ratingLabel: { fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  textArea: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, height: 80, marginTop: 4 },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 16, marginTop: 18 },
  payMethods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  payChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  payChipText: { fontSize: 13, fontWeight: '600' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14, marginTop: 4, borderStyle: 'dashed' },
  attachBtnText: { fontSize: 14, fontWeight: '600' },
  voucherAttached: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 12, marginTop: 4 },
  voucherText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
