import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

export default function CreateRequestScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/categories/leaves').then(setCategories).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!title || !description || !selectedCategory) {
      Alert.alert('Campos requeridos', 'Completa titulo, descripcion y categoria');
      return;
    }
    setLoading(true);
    try {
      await api.post('/requests', {
        title,
        description,
        categoryId: selectedCategory,
        budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
        budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
        isUrgent,
      });
      Alert.alert('Publicada', 'Tu solicitud ha sido publicada. Los ofertantes cercanos seran notificados.');
      setTitle(''); setDescription(''); setBudgetMin(''); setBudgetMax('');
      setSelectedCategory(''); setIsUrgent(false);
      router.push('/(tabs)/my-requests');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo publicar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Publicar solicitud</Text>
      <Text style={styles.subtitle}>Describe lo que necesitas y recibe propuestas</Text>

      <Text style={styles.label}>Categoria *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Titulo *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ej: Necesito delivery de comida" placeholderTextColor="#555" />

      <Text style={styles.label}>Descripcion *</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Detalla tu necesidad..." placeholderTextColor="#555" multiline numberOfLines={4} textAlignVertical="top" />

      <Text style={styles.label}>Presupuesto (COP)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.half]} value={budgetMin} onChangeText={setBudgetMin} placeholder="Minimo" placeholderTextColor="#555" keyboardType="numeric" />
        <TextInput style={[styles.input, styles.half]} value={budgetMax} onChangeText={setBudgetMax} placeholder="Maximo" placeholderTextColor="#555" keyboardType="numeric" />
      </View>

      <TouchableOpacity style={styles.urgentToggle} onPress={() => setIsUrgent(!isUrgent)}>
        <Ionicons name={isUrgent ? 'flash' : 'flash-outline'} size={20} color={isUrgent ? '#ff4444' : '#666'} />
        <Text style={[styles.urgentLabel, isUrgent && { color: '#ff4444' }]}>Urgente (expira en 24h)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.submitText}>{loading ? 'Publicando...' : 'Publicar solicitud'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#111', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#222' },
  textArea: { height: 100 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  categoryScroll: { marginBottom: 8 },
  chip: { backgroundColor: '#1a1a1a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#333' },
  chipActive: { backgroundColor: '#4ecdc4', borderColor: '#4ecdc4' },
  chipText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#000' },
  urgentToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, padding: 12, backgroundColor: '#111', borderRadius: 12 },
  urgentLabel: { color: '#666', fontSize: 14, fontWeight: '500' },
  submitButton: { backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28 },
  submitText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
