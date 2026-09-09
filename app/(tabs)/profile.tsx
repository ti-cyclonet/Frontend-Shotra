import { View, StyleSheet, TouchableOpacity, Switch, ScrollView, Modal, FlatList, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/context/ThemeProvider';
import { Text, Card, PressableCard, Button, IconChip, Badge, SectionLabel, spacing, radius } from '../../src/components/ui';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [addingSkill, setAddingSkill] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
    api.get('/categories/leaves').then(setCategories).catch(() => {});
  }, []);

  const loadProfile = () => {
    api.get('/profiles/me').then(setProfile).catch(() => {});
  };

  const toggleAvailability = async () => {
    try {
      const updated = await api.patch('/profiles/me/availability', {});
      setProfile(updated);
    } catch (err) {
      console.log('Error toggling availability', err);
    }
  };

  const addSkill = async (categoryId: string) => {
    setAddingSkill(true);
    try {
      await api.post('/profiles/me/skills', { categoryId });
      setShowAddSkill(false);
      loadProfile();
    } catch (err: any) {
      alert(err.message || 'No se pudo agregar la habilidad');
    } finally {
      setAddingSkill(false);
    }
  };

  const removeSkill = async (skillId: string) => {
    try {
      await api.delete(`/profiles/me/skills/${skillId}`);
      loadProfile();
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar');
    }
  };

  // Cambiar foto de perfil. Sube al endpoint CENTRAL de Authoriza (la foto vive
  // allí y se refleja en todas las apps). Tras subir, recarga el perfil.
  const changeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const name = asset.fileName || `avatar_${Date.now()}.jpg`;
      const type = asset.mimeType || 'image/jpeg';

      setUploadingAvatar(true);
      const res = await api.uploadAvatar({ uri: asset.uri, name, type });
      // Reflejar de inmediato con la URL que devuelve la subida (fuente de verdad).
      // OJO: NO llamar loadProfile() aquí — /profiles/me sincroniza el avatar desde
      // el TOKEN de Shotra, que aún es el viejo (sin la foto recién subida), así que
      // sobrescribiría la URL buena con una vacía. En el próximo login/switch-app el
      // token ya traerá el avatar actualizado desde Authoriza y quedará persistido.
      setProfile((p: any) => (p ? { ...p, avatarUrl: res.url } : { avatarUrl: res.url }));
    } catch (err: any) {
      alert(err.message || 'No se pudo actualizar la foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const activateProvider = async () => {
    try {
      await api.patch('/profiles/me', { isProvider: true });
      loadProfile();
    } catch (err) {
      console.log('Error activating provider', err);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Cabecera de perfil */}
      <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.header}>
        <TouchableOpacity activeOpacity={0.85} onPress={changeAvatar} disabled={uploadingAvatar}>
          <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={38} color={theme.accent} />
            )}
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </View>
          {/* Badge de cámara para indicar que es editable */}
          <View style={[styles.avatarCamera, { backgroundColor: theme.accent }]}>
            <Ionicons name="camera" size={14} color={theme.accentText} />
          </View>
        </TouchableOpacity>
        <Text variant="h1" style={{ marginTop: spacing[3] }}>{profile?.displayName || 'Cargando...'}</Text>
        <Text variant="body" muted style={{ marginTop: 2 }}>{profile?.email}</Text>
        {profile?.isProvider && (
          <Card padding={16} rounded={radius.xl} style={styles.statsCard}>
            <Stat value={profile?.averageRating?.toFixed(1) || '0.0'} label="Rating" accent={theme.accent} />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <Stat value={String(profile?.completedJobs || 0)} label="Trabajos" accent={theme.accent} />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <Stat value={String(profile?.level || 1)} label="Nivel" accent={theme.accent} />
          </Card>
        )}
      </Animated.View>

      {profile?.isProvider && (
        <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
          <SectionLabel>Disponibilidad</SectionLabel>
          <Card padding={16} rounded={radius.xl}>
            <View style={styles.toggleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                <IconChip icon="flash" color={profile?.isAvailable ? 'green' : 'neutral'} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">Listo para ganar</Text>
                  <Text variant="caption" muted>Recibe solicitudes cercanas</Text>
                </View>
              </View>
              <Switch
                value={profile?.isAvailable || false}
                onValueChange={toggleAvailability}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#fff"
              />
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Habilidades */}
      <Animated.View entering={FadeInDown.delay(140).springify().damping(16)}>
        <SectionLabel>Habilidades</SectionLabel>
        <Card padding={16} rounded={radius.xl}>
          <View style={styles.sectionHeader}>
            <Text variant="cardTitle">Mis servicios</Text>
            <TouchableOpacity onPress={() => setShowAddSkill(true)} hitSlop={8}>
              <Ionicons name="add-circle" size={26} color={theme.accent} />
            </TouchableOpacity>
          </View>
          {profile?.skills?.length > 0 ? (
            profile.skills.map((skill: any, i: number) => (
              <View key={skill.id} style={[styles.skillItem, i > 0 && { borderTopWidth: 1, borderTopColor: theme.glassBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                  <IconChip icon="pricetag" color="slate" size={34} />
                  <View>
                    <Text variant="bodyStrong">{skill.category?.name}</Text>
                    {skill.yearsExp > 0 && <Text variant="caption" muted>{skill.yearsExp} anios exp.</Text>}
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeSkill(skill.id)} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text variant="body" muted style={{ fontStyle: 'italic', paddingVertical: spacing[2] }}>Agrega tus habilidades para recibir solicitudes</Text>
          )}
        </Card>
      </Animated.View>

      {/* Estado de cuenta */}
      <Animated.View entering={FadeInDown.delay(200).springify().damping(16)}>
        <SectionLabel>Cuenta</SectionLabel>
        <PressableCard padding={14} rounded={radius.xl} onPress={() => router.push('/account-statement')} style={styles.navRow}>
          <IconChip icon="wallet-outline" color="red" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Estado de cuenta</Text>
            <Text variant="caption" muted>Comisiones y facturacion</Text>
          </View>
          <Badge label={profile?.plan === 'PRO' ? 'PRO' : 'FREE'} solid={profile?.plan === 'PRO'} />
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </PressableCard>
      </Animated.View>

      {!profile?.isProvider && (
        <Button
          label="Activar como ofertante"
          variant="gradient"
          icon="flash"
          fullWidth
          onPress={activateProvider}
          style={{ marginTop: spacing[5] }}
        />
      )}

      <Button
        label="Cerrar sesion"
        variant="ghost"
        icon="log-out-outline"
        onPress={logout}
        style={{ marginTop: spacing[3] }}
      />

      {/* Modal agregar habilidad */}
      <Modal visible={showAddSkill} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.glassBorder }]} />
            <View style={styles.modalHeader}>
              <Text variant="h2">Agregar habilidad</Text>
              <TouchableOpacity onPress={() => setShowAddSkill(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <Text variant="body" muted style={{ marginBottom: spacing[4] }}>Selecciona una categoria de servicio</Text>
            <FlatList
              data={categories.filter(c => !profile?.skills?.some((s: any) => s.categoryId === c.id))}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <PressableCard padding={12} rounded={radius.lg} onPress={() => addSkill(item.id)} disabled={addingSkill} style={styles.categoryOption}>
                  <IconChip icon="pricetag" color="red" size={34} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{item.name}</Text>
                    {item.parent?.name && <Text variant="caption" muted>{item.parent.name}</Text>}
                  </View>
                </PressableCard>
              )}
              ListEmptyComponent={<Text variant="body" muted style={{ fontStyle: 'italic' }}>No hay mas categorias disponibles</Text>}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="h2" color={accent}>{value}</Text>
      <Text variant="micro" muted style={{ marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[5], paddingTop: 60, paddingBottom: 120 },
  header: { alignItems: 'center', marginBottom: spacing[4] },
  avatar: { width: 84, height: 84, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 84, height: 84, borderRadius: radius.pill },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  avatarCamera: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  statsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: spacing[5], alignSelf: 'stretch' },
  stat: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[3] },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing[5], maxHeight: '72%' },
  modalHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: spacing[4] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
});
