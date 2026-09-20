import { View, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo, useRef } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../../src/services/api';
import { alertDialog } from '../../src/services/dialog';
import { useTheme } from '../../src/context/ThemeProvider';
import { Text, Card, PressableCard, Button, Input, IconChip, SectionLabel, spacing, radius, typography } from '../../src/components/ui';
import { RouteMapView, RoutePoint } from '../../src/components/RouteMapView';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface Category {
  id: string;
  name: string;
  slug?: string;
  parent?: { name: string; slug: string } | null;
  // Si la categoria implica trayecto (origen -> destino, ej. domicilios): se
  // muestran los campos de recogida/entrega + mapa de ruta.
  requiresRoute?: boolean;
}

/** Icono representativo segun el nombre de la categoria/grupo */
function catIcon(name?: string): IoniconName {
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
  const { theme } = useTheme();
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

  // ─── Trayecto (solo para categorias con requiresRoute) ─────────────────────
  const [destAddress, setDestAddress] = useState('');
  const [destCoords, setDestCoords] = useState<RoutePoint | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const geocodeTimer = useRef<any>(null);
  const [originCoords, setOriginCoords] = useState<RoutePoint | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    api.get('/categories/leaves').then(setCategories).catch(() => {});
  }, []);

  const selected = useMemo(() => categories.find((c) => c.id === selectedCategory), [categories, selectedCategory]);

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

  const requiresRoute = !!selected?.requiresRoute;

  const handleSubmit = async () => {
    if (!title || !description || !selectedCategory) {
      alertDialog('Campos requeridos', 'Completa titulo, descripcion y categoria');
      return;
    }
    if (requiresRoute && !destCoords) {
      alertDialog('Falta la dirección', 'Escribe la dirección de entrega para ubicarla en el mapa.');
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
        ...(requiresRoute && destCoords
          ? { address: destAddress.trim(), latitude: destCoords.lat, longitude: destCoords.lng }
          : {}),
        ...(requiresRoute && originCoords
          ? {
              originLatitude: originCoords.lat,
              originLongitude: originCoords.lng,
              originAddress: 'Punto de recogida (GPS)',
            }
          : {}),
      });
      alertDialog('Publicada', 'Tu solicitud ha sido publicada. Los ofertantes cercanos seran notificados.');
      setTitle(''); setDescription(''); setBudgetMin(''); setBudgetMax('');
      setSelectedCategory(''); setIsUrgent(false);
      setDestAddress(''); setDestCoords(null); setOriginCoords(null); setGeocodeFailed(false);
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

  /** Geocodifica (Nominatim/OpenStreetMap, sin costo) ~700ms despues de dejar de escribir. */
  const onDestAddressChange = (value: string) => {
    setDestAddress(value);
    setDestCoords(null);
    setGeocodeFailed(false);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    const address = value.trim();
    if (address.length < 6) return;
    geocodeTimer.current = setTimeout(() => geocodeAddress(address), 700);
  };

  const geocodeAddress = async (address: string) => {
    setGeocoding(true);
    setGeocodeFailed(false);
    try {
      const q = encodeURIComponent(`${address}, Colombia`);
      // Nominatim exige identificar la app (Referer o User-Agent) por su
      // politica de uso: https://operations.osmfoundation.org/policies/nominatim/
      // El navegador web (InOut) manda un Referer real automaticamente, pero
      // fetch() en Android/iOS no manda Referer y usa un User-Agent generico
      // (ej. okhttp), que Nominatim suele bloquear o devolver vacio. Sin este
      // header, la busqueda de direccion fallaba siempre en la app movil.
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
        headers: { 'User-Agent': 'ShotraApp/1.0 (contacto@cyclonet.com.co)' },
      });
      const results: Array<{ lat: string; lon: string }> = res.ok ? await res.json() : [];
      const hit = results?.[0];
      setDestCoords(hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null);
      setGeocodeFailed(!hit);
    } catch {
      setDestCoords(null);
      setGeocodeFailed(true);
    } finally {
      setGeocoding(false);
    }
  };

  /** Captura la ubicacion GPS como punto de recogida (origen). */
  const useMyLocationAsOrigin = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alertDialog('Permiso necesario', 'Activa el permiso de ubicación para capturar el punto de recogida.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setOriginCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      alertDialog('Error', 'No se pudo obtener tu ubicación.');
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text variant="sectionLabel" muted>Shotra</Text>
      <Text variant="h1">Publicar solicitud</Text>
      <Text variant="body" muted style={{ marginTop: 4 }}>Describe lo que necesitas y recibe propuestas</Text>

      {/* Categoria */}
      <SectionLabel>Categoria *</SectionLabel>
      <PressableCard padding={14} rounded={radius.lg} onPress={() => setPickerOpen(true)} style={styles.selector}>
        <IconChip icon={selected ? catIcon(selected.name) : 'grid-outline'} color="red" />
        <View style={{ flex: 1 }}>
          {selected ? (
            <>
              <Text variant="bodyStrong">{selected.name}</Text>
              {selected.parent?.name && <Text variant="caption" muted>{selected.parent.name}</Text>}
            </>
          ) : (
            <Text variant="body" muted>Selecciona una categoria</Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
      </PressableCard>

      {/* Trayecto: solo para categorias de recogida -> entrega (ej. domicilios) */}
      {requiresRoute && (
        <>
          <SectionLabel>Dirección de entrega *</SectionLabel>
          <Input
            value={destAddress}
            onChangeText={onDestAddressChange}
            placeholder="Ej: Calle 10 #20-30, Barrio Centro"
          />
          {geocoding && (
            <View style={styles.geoStatus}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text variant="caption" muted>Buscando dirección...</Text>
            </View>
          )}
          {!geocoding && geocodeFailed && (
            <Text variant="caption" style={{ color: theme.danger, marginTop: 4 }}>
              No se encontró esa dirección. Verifica que esté bien escrita.
            </Text>
          )}
          {!geocoding && destCoords && (
            <Text variant="caption" style={{ color: theme.success, marginTop: 4 }}>
              ✔ Dirección ubicada en el mapa
            </Text>
          )}

          <PressableCard
            padding={12}
            rounded={radius.lg}
            onPress={useMyLocationAsOrigin}
            style={[styles.selector, { marginTop: spacing[3] }]}
          >
            <IconChip icon="navigate" color={originCoords ? 'green' : 'red'} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{originCoords ? 'Punto de recogida capturado' : 'Usar mi ubicación como punto de recogida'}</Text>
              <Text variant="caption" muted>Opcional: de dónde recoge el domiciliario</Text>
            </View>
            {gettingLocation ? <ActivityIndicator size="small" color={theme.accent} /> : <Ionicons name="location-outline" size={20} color={theme.textMuted} />}
          </PressableCard>

          {(originCoords || destCoords) && (
            <View style={{ marginTop: spacing[3] }}>
              <RouteMapView origin={originCoords} destination={destCoords} />
            </View>
          )}
        </>
      )}

      <SectionLabel>Titulo *</SectionLabel>
      <Input value={title} onChangeText={setTitle} placeholder="Ej: Necesito delivery de comida" />

      <SectionLabel>Descripcion *</SectionLabel>
      <Input value={description} onChangeText={setDescription} placeholder="Detalla tu necesidad..." multiline numberOfLines={4} />

      <SectionLabel>Presupuesto (COP)</SectionLabel>
      <View style={styles.row}>
        <Input containerStyle={styles.half} value={budgetMin} onChangeText={setBudgetMin} placeholder="Minimo" keyboardType="numeric" />
        <Input containerStyle={styles.half} value={budgetMax} onChangeText={setBudgetMax} placeholder="Maximo" keyboardType="numeric" />
      </View>

      <PressableCard
        padding={14}
        rounded={radius.lg}
        onPress={() => setIsUrgent(!isUrgent)}
        style={[styles.urgentToggle, isUrgent && { borderColor: theme.danger }]}
      >
        <IconChip icon={isUrgent ? 'flash' : 'flash-outline'} color={isUrgent ? 'red' : 'neutral'} />
        <Text variant="bodyStrong" color={isUrgent ? theme.danger : theme.textMuted}>Urgente (expira en 24h)</Text>
      </PressableCard>

      <Button
        label={loading ? 'Publicando...' : 'Publicar solicitud'}
        variant="gradient"
        icon="megaphone"
        fullWidth
        loading={loading}
        onPress={handleSubmit}
        style={{ marginTop: spacing[6] }}
      />

      {/* Modal selector de categoria */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: theme.glassBorder }]} />
            <Text variant="h2" style={{ marginBottom: spacing[4] }}>Selecciona una categoria</Text>

            <View style={[styles.searchBox, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                style={[typography.body, styles.searchInput, { color: theme.inputText }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar categoria..."
                placeholderTextColor={theme.inputPlaceholder}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={grouped}
              keyExtractor={(g) => g.title}
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item: group }) => (
                <View style={{ marginBottom: spacing[4] }}>
                  <Text variant="sectionLabel" muted style={{ marginBottom: spacing[2] }}>{group.title}</Text>
                  {group.items.map((cat) => {
                    const isSel = cat.id === selectedCategory;
                    return (
                      <PressableCard
                        key={cat.id}
                        padding={12}
                        rounded={radius.lg}
                        onPress={() => pickCategory(cat.id)}
                        style={[styles.catRow, isSel && { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
                      >
                        <IconChip icon={catIcon(cat.name)} color="red" size={32} />
                        <Text variant="bodyStrong" style={{ flex: 1 }}>{cat.name}</Text>
                        {isSel && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
                      </PressableCard>
                    );
                  })}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyPicker}>
                  <IconChip icon="search-outline" color="neutral" size={48} />
                  <Text variant="body" muted style={{ marginTop: spacing[3] }}>Sin resultados para "{search}"</Text>
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
  content: { padding: spacing[5], paddingTop: 60, paddingBottom: 120 },
  row: { flexDirection: 'row', gap: spacing[3] },
  half: { flex: 1 },
  geoStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] },
  selector: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  urgentToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[5] },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing[5], maxHeight: '82%' },
  modalHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: spacing[4] },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], marginBottom: spacing[3] },
  searchInput: { flex: 1, paddingVertical: spacing[3] },
  modalList: { flexGrow: 0 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] },
  emptyPicker: { alignItems: 'center', paddingVertical: spacing[10] },
});
