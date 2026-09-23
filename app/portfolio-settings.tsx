import {
  View, StyleSheet, TouchableOpacity, ScrollView, Modal, Image, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../src/services/api';
import { useTheme } from '../src/context/ThemeProvider';
import { confirmDialog, alertDialog } from '../src/services/dialog';
import { Text, Card, Button, spacing, radius } from '../src/components/ui';

const MAX_ITEMS = 10;
const MAX_IN_OFFER = 3;

export default function PortfolioSettingsScreen() {
  const { theme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pendingAsset, setPendingAsset] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get('/profiles/me').then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const portfolio: any[] = profile?.portfolio || [];
  const selectedCount = portfolio.filter((p) => p.showInOffer).length;

  const pickImage = async () => {
    if (portfolio.length >= MAX_ITEMS) {
      alertDialog('Límite alcanzado', `Ya tienes ${MAX_ITEMS} imágenes cargadas. Elimina alguna para subir una nueva.`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      setPendingAsset(result.assets[0]);
      setTitle('');
      setDescription('');
      setShowAddModal(true);
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo abrir la galería');
    }
  };

  const saveItem = async () => {
    if (!pendingAsset) return;
    if (!title.trim()) {
      alertDialog('Falta el título', 'Ingresa un título para la foto');
      return;
    }
    setSaving(true);
    try {
      const name = pendingAsset.fileName || `trabajo_${Date.now()}.jpg`;
      const type = pendingAsset.mimeType || 'image/jpeg';
      await api.uploadPortfolioItem(
        { uri: pendingAsset.uri, name, type },
        { title: title.trim(), description: description.trim() || undefined },
      );
      setShowAddModal(false);
      setPendingAsset(null);
      load();
    } catch (err: any) {
      alertDialog('No se pudo subir la foto', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleShowInOffer = async (item: any) => {
    if (!item.showInOffer && selectedCount >= MAX_IN_OFFER) {
      alertDialog('Límite alcanzado', `Ya tienes ${MAX_IN_OFFER} imágenes seleccionadas para tu oferta. Deselecciona una primero.`);
      return;
    }
    setBusyItemId(item.id);
    try {
      await api.patch(`/portfolio/${item.id}/offer`, { showInOffer: !item.showInOffer });
      load();
    } catch (err: any) {
      alertDialog('No se pudo actualizar', err.message);
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (item: any) => {
    const ok = await confirmDialog('Eliminar foto', '¿Seguro que deseas eliminar esta foto de tu portafolio?', 'Eliminar');
    if (!ok) return;
    setBusyItemId(item.id);
    try {
      await api.delete(`/portfolio/${item.id}`);
      load();
    } catch (err: any) {
      alertDialog('No se pudo eliminar', err.message);
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)/profile'))}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text variant="h2">Fotos de mi oferta</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text variant="body" muted style={{ marginBottom: spacing[4] }}>
            Sube fotos de trabajos realizados (hasta {MAX_ITEMS}) y elige cuáles se muestran en tu oferta
            a los solicitantes (hasta {MAX_IN_OFFER}). Toca una foto para verla ampliada.
          </Text>

          <View style={styles.countersRow}>
            <Card padding={12} rounded={radius.lg} style={{ flex: 1 }}>
              <Text variant="h2" color={theme.accent}>{portfolio.length}/{MAX_ITEMS}</Text>
              <Text variant="micro" muted>Cargadas</Text>
            </Card>
            <Card padding={12} rounded={radius.lg} style={{ flex: 1 }}>
              <Text variant="h2" color={theme.accent}>{selectedCount}/{MAX_IN_OFFER}</Text>
              <Text variant="micro" muted>En tu oferta</Text>
            </Card>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { borderColor: theme.accent, opacity: portfolio.length >= MAX_ITEMS ? 0.5 : 1 }]}
            onPress={pickImage}
            disabled={portfolio.length >= MAX_ITEMS}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
            <Text style={{ color: theme.accent, fontWeight: '700' }}>Agregar foto</Text>
          </TouchableOpacity>

          {portfolio.length === 0 ? (
            <Card padding={16} rounded={radius.xl} style={{ marginTop: spacing[4] }}>
              <Text variant="body" muted style={{ fontStyle: 'italic' }}>
                Aún no has subido fotos de tus trabajos
              </Text>
            </Card>
          ) : (
            <View style={styles.grid}>
              {portfolio.map((item: any) => (
                <Card key={item.id} padding={8} rounded={radius.lg} style={styles.itemCard}>
                  <TouchableOpacity onPress={() => setPreviewImage(item.imageUrl)}>
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImg} />
                    {item.showInOffer && (
                      <View style={[styles.offerBadge, { backgroundColor: theme.accent }]}>
                        <Text style={{ color: theme.accentText, fontSize: 10, fontWeight: '800' }}>EN OFERTA</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text variant="caption" numberOfLines={1} style={{ marginTop: 6 }}>{item.title}</Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[styles.offerToggle, item.showInOffer && { backgroundColor: theme.accentSoft }]}
                      onPress={() => toggleShowInOffer(item)}
                      disabled={busyItemId === item.id}
                    >
                      <Ionicons
                        name={item.showInOffer ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={item.showInOffer ? theme.accent : theme.textMuted}
                      />
                      <Text variant="micro" style={{ color: item.showInOffer ? theme.accent : theme.textMuted }}>
                        Mostrar en oferta
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeItem(item)} disabled={busyItemId === item.id} hitSlop={6}>
                      <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal titular/describir la foto antes de subirla */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.glassBorder }]} />
            <View style={styles.modalHeader}>
              <Text variant="h2">Nueva foto de trabajo</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {pendingAsset?.uri && <Image source={{ uri: pendingAsset.uri }} style={styles.previewThumb} />}
              <Text variant="caption" muted style={{ marginTop: spacing[3], marginBottom: 4 }}>Título *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Instalación eléctrica residencial"
                placeholderTextColor={theme.inputPlaceholder}
              />
              <Text variant="caption" muted style={{ marginTop: spacing[3], marginBottom: 4 }}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Cuenta brevemente de qué se trató el trabajo"
                placeholderTextColor={theme.inputPlaceholder}
                multiline
                numberOfLines={2}
              />
              <Button
                label={saving ? 'Subiendo...' : 'Guardar'}
                variant="gradient"
                icon="cloud-upload-outline"
                fullWidth
                disabled={saving}
                onPress={saveItem}
                style={{ marginTop: spacing[4], marginBottom: spacing[2] }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Vista ampliada */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && <Image source={{ uri: previewImage }} style={styles.previewImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 52 },
  backButton: { padding: 4 },
  content: { paddingHorizontal: spacing[5], paddingBottom: 60 },
  countersRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 12, marginBottom: spacing[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  itemCard: { width: '47%' },
  itemImg: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
  offerBadge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  itemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  offerToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing[5], maxHeight: '80%' },
  modalHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: spacing[4] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  previewThumb: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, marginTop: spacing[2] },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1.5 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImg: { width: '100%', height: '80%' },
});
