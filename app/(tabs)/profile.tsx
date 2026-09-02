import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Modal, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import { useGlass } from '../../src/context/ThemeProvider';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const glass = useGlass();
  const theme = glass.theme;
  const [profile, setProfile] = useState<any>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [addingSkill, setAddingSkill] = useState(false);

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

  // Activar como ofertante si aún no lo es
  const activateProvider = async () => {
    try {
      await api.patch('/profiles/me', { isProvider: true });
      loadProfile();
    } catch (err) {
      console.log('Error activating provider', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatarPlaceholder, glass.card]}>
          <Ionicons name="person" size={36} color={theme.textMuted} />
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{profile?.displayName || 'Cargando...'}</Text>
        <Text style={[styles.email, { color: theme.textMuted }]}>{profile?.email}</Text>
        {profile?.isProvider && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{profile?.averageRating?.toFixed(1) || '0.0'}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Rating</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{profile?.completedJobs || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Trabajos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.accent }]}>{profile?.level || 1}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Nivel</Text>
            </View>
          </View>
        )}
      </View>

      {profile?.isProvider && (
        <View style={[styles.section, glass.card]}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleTitle, { color: theme.text }]}>Listo para ganar</Text>
              <Text style={[styles.toggleSubtitle, { color: theme.textMuted }]}>Recibe solicitudes cercanas</Text>
            </View>
            <Switch
              value={profile?.isAvailable || false}
              onValueChange={toggleAvailability}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor={profile?.isAvailable ? '#fff' : '#888'}
            />
          </View>
        </View>
      )}

      <View style={[styles.section, glass.card]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Habilidades</Text>
          <TouchableOpacity onPress={() => setShowAddSkill(true)} style={styles.addButton}>
            <Ionicons name="add-circle" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>
        {profile?.skills?.length > 0 ? (
          profile.skills.map((skill: any) => (
            <View key={skill.id} style={[styles.skillItem, { borderBottomColor: theme.glassBorder }]}>
              <View>
                <Text style={[styles.skillName, { color: theme.text }]}>{skill.category?.name}</Text>
                {skill.yearsExp > 0 && <Text style={[styles.skillExp, { color: theme.textMuted }]}>{skill.yearsExp} anios exp.</Text>}
              </View>
              <TouchableOpacity onPress={() => removeSkill(skill.id)}>
                <Ionicons name="close-circle" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={[styles.emptySkills, { color: theme.textMuted }]}>Agrega tus habilidades para recibir solicitudes</Text>
        )}
      </View>

      {/* Estado de cuenta (comisiones) */}
      <TouchableOpacity style={[styles.navRow, glass.card]} onPress={() => router.push('/account-statement')}>
        <View style={[styles.navIcon, { backgroundColor: theme.accent + '22' }]}>
          <Ionicons name="wallet-outline" size={20} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.navTitle, { color: theme.text }]}>Estado de cuenta</Text>
          <Text style={[styles.navSubtitle, { color: theme.textMuted }]}>Comisiones y facturación</Text>
        </View>
        <View style={[styles.planBadge, glass.chip]}>
          <Text style={[styles.planBadgeText, { color: theme.accent }]}>{profile?.plan === 'PRO' ? 'PRO' : 'FREE'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      {!profile?.isProvider && (
        <TouchableOpacity style={[styles.providerButton, { backgroundColor: theme.accent }]} onPress={activateProvider}>
          <Ionicons name="flash" size={20} color={theme.accentText} />
          <Text style={[styles.providerButtonText, { color: theme.accentText }]}>Activar como ofertante</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Cerrar sesion</Text>
      </TouchableOpacity>

      {/* Modal para agregar habilidad */}
      <Modal visible={showAddSkill} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Agregar habilidad</Text>
              <TouchableOpacity onPress={() => setShowAddSkill(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>Selecciona una categoria de servicio</Text>
            <FlatList
              data={categories.filter(c => !profile?.skills?.some((s: any) => s.categoryId === c.id))}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryOption, glass.chip]}
                  onPress={() => addSkill(item.id)}
                  disabled={addingSkill}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: theme.accent + '22' }]}>
                    <Ionicons name="pricetag" size={16} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.categoryOptionText, { color: theme.text }]}>{item.name}</Text>
                    {item.parent?.name && <Text style={[styles.categoryOptionParent, { color: theme.textMuted }]}>{item.parent.name}</Text>}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[styles.emptySkills, { color: theme.textMuted }]}>No hay mas categorias disponibles</Text>}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, paddingTop: 56 },
  header: { alignItems: 'center', marginBottom: 28 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800' },
  email: { fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 18 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#4ecdc4' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  section: { borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  addButton: { padding: 4 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  toggleSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },
  skillItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  skillName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  skillExp: { color: '#888', fontSize: 12, marginTop: 2 },
  emptySkills: { color: '#555', fontSize: 13, fontStyle: 'italic' },
  providerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 16, backgroundColor: '#4ecdc4', borderRadius: 12, marginBottom: 16 },
  providerButtonText: { color: '#000', fontSize: 15, fontWeight: '700' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 16 },
  navIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 15, fontWeight: '700' },
  navSubtitle: { fontSize: 12, marginTop: 2 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 4 },
  planBadgeText: { fontSize: 11, fontWeight: '800' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 16, marginTop: 12 },
  logoutText: { color: '#ff4444', fontSize: 15, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 8 },
  catIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  categoryOptionText: { fontSize: 15, fontWeight: '600' },
  categoryOptionParent: { fontSize: 12, marginTop: 2 },
});
