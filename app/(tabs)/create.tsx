import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList, Pressable } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { alertDialog } from '../../src/services/dialog';
import { useGlass } from '../../src/context/ThemeProvider';

interface Category {
  id: string;
  name: string;
  slug?: string;
  parent?: { name: string; slug: string } | null;
}

/** Icono representativo segun el nombre de la categoria/grupo */
function catIcon(name?: string): any {
  const n = (name || '').toLowerCase();
  if (n.includes('comida') || n.includes('delivery')) return 'fast-food';
  if (n.includes('mercado')) return 'cart';
  if (n.includes('mensaj') || n.includes('paquet')) return 'cube';
  if (n.includes('mudanz')) return 'car';
  if (n.includes('compra') || n.includes('mandad')) return 'bag-handle';
  if (n.includes('farmac') || n.includes('medic')) return 'medkit';
  if (n.includes('domicil')) return 'bicycle';
  return 'pricetag';
}

export default function CreateRequestScreen() {
  const glass = useGlass();
  const theme = glass.theme;
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/categories/leaves').then(setCategories).catch(() => {});
  }, []);

  const selected = useMemo(() => categories.find((c) => c.id === selectedCategory), [categories, selectedCategory]);

  // Filtrado + agrupacion por categoria padre para escalar a muchas categorias
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? categories.filter((c) => c.name.toLowerCase().includes(q) || (c.parent?.name || '').toLowerCase().includes(q))
      : categories;

    const groups: { title: string; items: Category[] }[] = [];
    const map = new Map<string, Category[]>();
    for (const c of filtered) {
      const key = c.parent?.name || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    for (const [title, items] of map) groups.push({ title, items });
    groups.sort((a, b) => a.title.localeCompare(b.title));
    return groups;
  }, [categories, search]);

  const handleSubmit = async () => {
    if (!title || !description || !selectedCategory) {
      alertDialog('Campos requeridos', 'Completa titulo, descripcion y categoria');
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
      alertDialog('Publicada', 'Tu solicitud ha sido publicada. Los ofertantes cercanos seran notificados.');
      setTitle(''); setDescription(''); setBudgetMin(''); setBudgetMax('');
      setSelectedCategory(''); setIsUrgent(false);
      router.push('/(tabs)/my-requests');
    } catch (err: any) {
      alertDialog('Error', err.message || 'No se pudo publicar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const pickCategory = (id: string) => {
    setSelectedCategory(id);
    setPickerOpen(false);
    setSearch('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Publicar solicitud</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Describe lo que necesitas y recibe propuestas</Text>

      {/* Selector de categoria (abre modal con busqueda) */}
      <Text style={[styles.label, { color: theme.textMuted }]}>Categoria *</Text>
      <TouchableOpacity
        style={[styles.selector, glass.card]}
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.85}
      >
        <View style={styles.selectorLeft}>
          <View style={[styles.selectorIcon, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name={selected ? catIcon(selected.name) : 'grid-outline'} size={18} color={theme.accent} />
          </View>
          <View>
            {selected ? (
              <>
                <Text style={[styles.selectorValue, { color: theme.text }]}>{selected.name}</Text>
                {selected.parent?.name && (
                  <Text style={[styles.selectorHint, { color: theme.textMuted }]}>{selected.parent.name}</Text>
                )}
              </>
            ) : (
              <Text style={[styles.selectorPlaceholder, { color: theme.textMuted }]}>Selecciona una categoria</Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      <Text style={[styles.label, { color: theme.textMuted }]}>Titulo *</Text>
      <TextInput
        style={[styles.input, glass.card, { color: theme.text }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Ej: Necesito delivery de comida"
        placeholderTextColor={theme.textMuted}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Descripcion *</Text>
      <TextInput
        style={[styles.input, styles.textArea, glass.card, { color: theme.text }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Detalla tu necesidad..."
        placeholderTextColor={theme.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Presupuesto (COP)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.half, glass.card, { color: theme.text }]} value={budgetMin} onChangeText={setBudgetMin} placeholder="Minimo" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
        <TextInput style={[styles.input, styles.half, glass.card, { color: theme.text }]} value={budgetMax} onChangeText={setBudgetMax} placeholder="Maximo" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
      </View>

      <TouchableOpacity style={[styles.urgentToggle, glass.card, isUrgent && { borderColor: '#ff4444' }]} onPress={() => setIsUrgent(!isUrgent)}>
        <Ionicons name={isUrgent ? 'flash' : 'flash-outline'} size={20} color={isUrgent ? '#ff4444' : theme.textMuted} />
        <Text style={[styles.urgentLabel, { color: isUrgent ? '#ff4444' : theme.textMuted }]}>Urgente (expira en 24h)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.accent }]} onPress={handleSubmit} disabled={loading}>
        <Ionicons name="megaphone" size={18} color={theme.accentText} />
        <Text style={[styles.submitText, { color: theme.accentText }]}>{loading ? 'Publicando...' : 'Publicar solicitud'}</Text>
      </TouchableOpacity>

      {/* Modal selector de categoria con busqueda y agrupacion */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Selecciona una categoria</Text>

            {/* Buscador */}
            <View style={[styles.searchBox, glass.card]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar categoria..."
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={grouped}
              keyExtractor={(g) => g.title}
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: group }) => (
                <View style={styles.group}>
                  <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{group.title}</Text>
                  {group.items.map((cat) => {
                    const isSel = cat.id === selectedCategory;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catRow, glass.chip, isSel && { borderColor: theme.accent, backgroundColor: theme.accent + '1a' }]}
                        onPress={() => pickCategory(cat.id)}
                      >
                        <View style={[styles.catIconWrap, { backgroundColor: theme.accent + '22' }]}>
                          <Ionicons name={catIcon(cat.name)} size={16} color={theme.accent} />
                        </View>
                        <Text style={[styles.catName, { color: theme.text }]}>{cat.name}</Text>
                        {isSel && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyPicker}>
                  <Ionicons name="search-outline" size={40} color={theme.textMuted} />
                  <Text style={[styles.emptyPickerText, { color: theme.textMuted }]}>Sin resultados para "{search}"</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, paddingTop: 56 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 12, padding: 14, fontSize: 15 },
  textArea: { height: 100 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  // Selector de categoria
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 14 },
  selectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  selectorIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  selectorValue: { fontSize: 15, fontWeight: '700' },
  selectorHint: { fontSize: 12, marginTop: 1 },
  selectorPlaceholder: { fontSize: 15 },
  // Toggle urgente
  urgentToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, padding: 14, borderRadius: 12 },
  urgentLabel: { fontSize: 14, fontWeight: '600' },
  // Submit
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 16, marginTop: 28 },
  submitText: { fontSize: 16, fontWeight: '800' },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  modalList: { flexGrow: 0 },
  group: { marginBottom: 16 },
  groupTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, marginBottom: 8 },
  catIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  catName: { flex: 1, fontSize: 15, fontWeight: '600' },
  emptyPicker: { alignItems: 'center', paddingVertical: 40 },
  emptyPickerText: { fontSize: 14, marginTop: 12 },
});
