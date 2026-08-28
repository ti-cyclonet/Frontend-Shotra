import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get('/profiles/me').then(setProfile).catch(() => {});
  }, []);

  const toggleAvailability = async () => {
    try {
      const updated = await api.patch('/profiles/me/availability', {});
      setProfile(updated);
    } catch (err) {
      console.log('Error toggling availability', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={36} color="#666" />
        </View>
        <Text style={styles.name}>{profile?.displayName || 'Cargando...'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        {profile?.isProvider && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.averageRating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.completedJobs || 0}</Text>
              <Text style={styles.statLabel}>Trabajos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile?.level || 1}</Text>
              <Text style={styles.statLabel}>Nivel</Text>
            </View>
          </View>
        )}
      </View>

      {profile?.isProvider && (
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Listo para ganar</Text>
              <Text style={styles.toggleSubtitle}>Recibe solicitudes cercanas</Text>
            </View>
            <Switch
              value={profile?.isAvailable || false}
              onValueChange={toggleAvailability}
              trackColor={{ false: '#333', true: '#4ecdc4' }}
              thumbColor={profile?.isAvailable ? '#fff' : '#888'}
            />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Habilidades</Text>
        {profile?.skills?.length > 0 ? (
          profile.skills.map((skill: any) => (
            <View key={skill.id} style={styles.skillItem}>
              <Text style={styles.skillName}>{skill.category?.name}</Text>
              <Text style={styles.skillExp}>{skill.yearsExp || 0} anios exp.</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptySkills}>Agrega tus habilidades para recibir solicitudes</Text>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingTop: 56 },
  header: { alignItems: 'center', marginBottom: 28 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  email: { fontSize: 14, color: '#888', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 18 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#4ecdc4' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  section: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  toggleSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },
  skillItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  skillName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  skillExp: { color: '#888', fontSize: 13 },
  emptySkills: { color: '#555', fontSize: 13, fontStyle: 'italic' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 16, marginTop: 12 },
  logoutText: { color: '#ff4444', fontSize: 15, fontWeight: '600' },
});
