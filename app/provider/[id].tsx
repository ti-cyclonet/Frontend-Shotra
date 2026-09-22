import { View, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/context/ThemeProvider';
import { Text, Card, IconChip, SectionLabel, spacing, radius } from '../../src/components/ui';

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/profiles/${id}`),
      api.get(`/ratings/profile/${id}`),
    ])
      .then(([p, r]) => {
        setProfile(p);
        setRatings(Array.isArray(r) ? r : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text variant="body" muted>No se pudo cargar este perfil</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)/feed'))}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text variant="h2">Perfil del ofertante</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cabecera */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={38} color={theme.accent} />
            )}
          </View>
          <Text variant="h1" style={{ marginTop: spacing[3] }}>{profile.displayName}</Text>
          {profile.bio && <Text variant="body" muted style={{ marginTop: 4, textAlign: 'center' }}>{profile.bio}</Text>}

          <Card padding={16} rounded={radius.xl} style={styles.statsCard}>
            <Stat value={profile.averageRating > 0 ? profile.averageRating.toFixed(1) : '—'} label={`Rating (${profile.totalRatings || 0})`} accent={theme.accent} />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <Stat value={String(profile.completedJobs || 0)} label="Trabajos" accent={theme.accent} />
            <View style={[styles.statDivider, { backgroundColor: theme.glassBorder }]} />
            <Stat value={String(profile.level || 1)} label="Nivel" accent={theme.accent} />
          </Card>
        </View>

        {/* Habilidades */}
        {profile.skills?.length > 0 && (
          <View>
            <SectionLabel>Servicios que ofrece</SectionLabel>
            <View style={styles.skillsWrap}>
              {profile.skills.map((skill: any) => (
                <View key={skill.id} style={[styles.skillChip, { backgroundColor: theme.accentSoft }]}>
                  <Text variant="caption" style={{ color: theme.accent, fontWeight: '700' }}>{skill.category?.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Portafolio */}
        <SectionLabel>Trabajos realizados</SectionLabel>
        <Card padding={16} rounded={radius.xl}>
          {profile.portfolio?.length > 0 ? (
            <View style={styles.portfolioGrid}>
              {profile.portfolio.map((item: any) => (
                <TouchableOpacity key={item.id} style={styles.portfolioItem} onPress={() => setPreviewImage(item.imageUrl)}>
                  <Image source={{ uri: item.imageUrl }} style={styles.portfolioImg} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text variant="body" muted style={{ fontStyle: 'italic' }}>Este ofertante aún no agregó fotos de trabajos realizados</Text>
          )}
        </Card>

        {/* Comentarios / evaluaciones */}
        <SectionLabel>{`Comentarios de clientes (${ratings.length})`}</SectionLabel>
        {ratings.length > 0 ? (
          ratings.map((rating: any) => (
            <Card key={rating.id} padding={16} rounded={radius.xl} style={{ marginBottom: spacing[2] }}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAuthorRow}>
                  <View style={[styles.reviewAvatar, { backgroundColor: theme.accentSoft }]}>
                    {rating.author?.avatarUrl ? (
                      <Image source={{ uri: rating.author.avatarUrl }} style={styles.reviewAvatarImg} />
                    ) : (
                      <Ionicons name="person" size={12} color={theme.accent} />
                    )}
                  </View>
                  <Text variant="bodyStrong">{rating.author?.displayName || 'Usuario'}</Text>
                </View>
                <Text style={{ color: '#f39c12', fontWeight: '800' }}>★ {rating.score}</Text>
              </View>
              {rating.comment && <Text variant="body" style={{ marginTop: 6 }}>{rating.comment}</Text>}
            </Card>
          ))
        ) : (
          <Card padding={16} rounded={radius.xl}>
            <Text variant="body" muted style={{ fontStyle: 'italic' }}>Aún no tiene comentarios de clientes</Text>
          </Card>
        )}
      </ScrollView>

      {/* Vista ampliada de una foto del portafolio */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && <Image source={{ uri: previewImage }} style={styles.previewImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 52 },
  backButton: { padding: 4 },
  content: { paddingHorizontal: spacing[5], paddingBottom: 60 },
  profileHeader: { alignItems: 'center', marginBottom: spacing[4] },
  avatar: { width: 84, height: 84, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 84, height: 84, borderRadius: radius.pill },
  statsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: spacing[5], alignSelf: 'stretch' },
  stat: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 32 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[2] },
  skillChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  portfolioItem: { width: '31%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden' },
  portfolioImg: { width: '100%', height: '100%' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  reviewAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  reviewAvatarImg: { width: 26, height: 26, borderRadius: 13 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImg: { width: '100%', height: '80%' },
});
