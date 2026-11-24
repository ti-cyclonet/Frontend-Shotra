import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeProvider';
import { alertDialog } from '../../src/services/dialog';
import { Text, Input, Button, PressableCard, IconChip, SectionLabel, spacing, radius } from '../../src/components/ui';
import { RouteMapView, RoutePoint } from '../../src/components/RouteMapView';
import {
  routesApi, geocode, currentPosition,
  PACKAGE_OPTIONS, DETOUR_OPTIONS, PackageSize, DetourPreset,
} from '../../src/services/routes';
import { useNav, headerTop } from '../../src/web/nav';

/** Salidas que se ofrecen: minutos desde ahora (0 = ya). */
const DEPARTURES = [
  { min: 0, label: 'Ya' },
  { min: 15, label: 'En 15 min' },
  { min: 30, label: 'En 30 min' },
  { min: 60, label: 'En 1 h' },
  { min: 120, label: 'En 2 h' },
];

/** Dirección escrita que se ubica en el mapa ~700 ms después de dejar de escribir. */
function useGeocodedAddress() {
  const [text, setText] = useState('');
  const [point, setPoint] = useState<RoutePoint | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const onChange = (value: string) => {
    setText(value);
    setPoint(null);
    setFailed(false);
    if (timer.current) clearTimeout(timer.current);
    const address = value.trim();
    if (address.length < 6) return;
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const hit = await geocode(address);
        setPoint(hit);
        setFailed(!hit);
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    }, 700);
  };

  return { text, point, busy, failed, onChange, setPoint, setText };
}

export default function NewRouteScreen() {
  const nav = useNav();
  const { theme } = useTheme();
  const origin = useGeocodedAddress();
  const dest = useGeocodedAddress();
  const [originIsGps, setOriginIsGps] = useState(false);
  const [locating, setLocating] = useState(false);
  const [departIn, setDepartIn] = useState(0);
  const [detour, setDetour] = useState<DetourPreset>('MEDIUM');
  const [pkg, setPkg] = useState<PackageSize>('SMALL');
  const [maxOrders, setMaxOrders] = useState(3);
  const [saving, setSaving] = useState(false);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const here = await currentPosition();
      if (!here) {
        alertDialog('Permiso necesario', 'Activa el permiso de ubicación para usar tu posición como salida.');
        return;
      }
      origin.setText('');
      origin.setPoint(here);
      setOriginIsGps(true);
    } catch {
      alertDialog('Error', 'No se pudo obtener tu ubicación.');
    } finally {
      setLocating(false);
    }
  };

  const onOriginText = (v: string) => {
    setOriginIsGps(false);
    origin.onChange(v);
  };

  const submit = async () => {
    if (!origin.point || !dest.point) {
      alertDialog('Faltan datos', 'Indica de dónde sales y a dónde vas.');
      return;
    }
    setSaving(true);
    try {
      const route = await routesApi.create({
        originLatitude: origin.point.lat,
        originLongitude: origin.point.lng,
        originAddress: originIsGps ? 'Mi ubicación' : origin.text.trim() || undefined,
        destLatitude: dest.point.lat,
        destLongitude: dest.point.lng,
        destAddress: dest.text.trim() || undefined,
        departAt: new Date(Date.now() + departIn * 60_000).toISOString(),
        detour,
        maxPackageSize: pkg,
        maxOrders,
      });
      const found = route.matchesCount ?? 0;
      alertDialog(
        'Ruta publicada',
        found
          ? `Ya hay ${found} pedido${found === 1 ? '' : 's'} en tu camino.`
          : 'Te avisamos cuando aparezca un pedido en tu camino.',
      );
      // Reemplaza este formulario por el detalle de la ruta
      nav.back('/routes');
      nav.open(`/routes/${route.id}`);
    } catch (err: any) {
      alertDialog('No se pudo publicar', err.message || 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => nav.back('/routes')}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text variant="h2">Nueva ruta</Text>
        <View style={{ width: 26 }} />
      </View>

      <SectionLabel>¿De dónde sales? *</SectionLabel>
      <PressableCard padding={12} rounded={radius.lg} onPress={useMyLocation} style={styles.row}>
        <IconChip icon="locate" color={originIsGps ? 'green' : 'red'} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{originIsGps ? 'Saldré desde mi ubicación' : 'Usar mi ubicación actual'}</Text>
          <Text variant="caption" muted>O escribe la dirección de salida</Text>
        </View>
        {locating ? <ActivityIndicator size="small" color={theme.accent} /> : null}
      </PressableCard>
      <Input
        value={origin.text}
        onChangeText={onOriginText}
        placeholder="Ej: Calle 72 #10-20"
        containerStyle={{ marginTop: spacing[2] }}
      />
      <AddressStatus busy={origin.busy} failed={origin.failed} ok={!!origin.point && !originIsGps} />

      <SectionLabel>¿A dónde vas? *</SectionLabel>
      <Input value={dest.text} onChangeText={dest.onChange} placeholder="Ej: Carrera 15 #93-40" />
      <AddressStatus busy={dest.busy} failed={dest.failed} ok={!!dest.point} />

      {(origin.point || dest.point) && (
        <View style={{ marginTop: spacing[3] }}>
          <RouteMapView origin={origin.point} destination={dest.point} />
        </View>
      )}

      <SectionLabel>¿Cuándo sales?</SectionLabel>
      <View style={styles.chips}>
        {DEPARTURES.map((d) => (
          <Choice key={d.min} label={d.label} selected={departIn === d.min} onPress={() => setDepartIn(d.min)} />
        ))}
      </View>

      <SectionLabel>¿Cuánto te desvías por un pedido?</SectionLabel>
      <View style={styles.chips}>
        {DETOUR_OPTIONS.map((o) => (
          <Choice key={o.value} label={o.label} hint={o.hint} selected={detour === o.value} onPress={() => setDetour(o.value)} />
        ))}
      </View>

      <SectionLabel>¿Qué tamaño puedes llevar?</SectionLabel>
      <View style={styles.chips}>
        {PACKAGE_OPTIONS.map((o) => (
          <Choice key={o.value} label={o.label} hint={o.hint} selected={pkg === o.value} onPress={() => setPkg(o.value)} />
        ))}
      </View>

      <SectionLabel>Pedidos a la vez</SectionLabel>
      <View style={[styles.row, styles.stepper]}>
        <TouchableOpacity onPress={() => setMaxOrders((n) => Math.max(1, n - 1))} hitSlop={8} disabled={maxOrders <= 1}>
          <Ionicons name="remove-circle-outline" size={30} color={maxOrders <= 1 ? theme.textMuted : theme.accent} />
        </TouchableOpacity>
        <Text variant="h2" style={{ minWidth: 30, textAlign: 'center' }}>{maxOrders}</Text>
        <TouchableOpacity onPress={() => setMaxOrders((n) => Math.min(5, n + 1))} hitSlop={8} disabled={maxOrders >= 5}>
          <Ionicons name="add-circle-outline" size={30} color={maxOrders >= 5 ? theme.textMuted : theme.accent} />
        </TouchableOpacity>
        <Text variant="caption" muted style={{ flex: 1 }}>Máximo de pedidos que llevas en este viaje</Text>
      </View>

      <Button
        label={saving ? 'Publicando...' : 'Publicar ruta'}
        variant="gradient"
        icon="navigate"
        fullWidth
        loading={saving}
        disabled={saving || !origin.point || !dest.point}
        onPress={submit}
        style={{ marginTop: spacing[6] }}
      />
      <Text variant="caption" muted style={{ marginTop: spacing[3], textAlign: 'center' }}>
        Los solicitantes nunca ven tu ruta: solo reciben tu oferta como cualquier otra.
      </Text>
    </ScrollView>
  );
}

function AddressStatus({ busy, failed, ok }: { busy: boolean; failed: boolean; ok: boolean }) {
  const { theme } = useTheme();
  if (busy) {
    return (
      <View style={styles.status}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text variant="caption" muted>Buscando dirección...</Text>
      </View>
    );
  }
  if (failed) return <Text variant="caption" style={{ color: theme.danger, marginTop: 4 }}>No se encontró esa dirección.</Text>;
  if (ok) return <Text variant="caption" style={{ color: theme.success, marginTop: 4 }}>✔ Ubicada en el mapa</Text>;
  return null;
}

function Choice({ label, hint, selected, onPress }: { label: string; hint?: string; selected: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.choice,
        { borderColor: selected ? theme.accent : theme.glassBorder, backgroundColor: selected ? theme.accentSoft : theme.glass },
      ]}
    >
      <Text variant="bodyStrong" color={selected ? theme.accent : theme.text}>{label}</Text>
      {hint ? <Text variant="micro" muted>{hint}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[5], paddingTop: 0, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingTop: headerTop(52) },
  backButton: { padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  choice: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  stepper: { marginTop: spacing[1] },
});
