import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../src/services/api';
import { useTheme } from '../src/context/ThemeProvider';
import { alertDialog } from '../src/services/dialog';

const GENDERS = [
  { key: 'M', label: 'Masculino' },
  { key: 'F', label: 'Femenino' },
  { key: 'O', label: 'Otro' },
];

const CIVIL_STATUSES = [
  { key: 'S', label: 'Soltero/a' },
  { key: 'C', label: 'Casado/a' },
  { key: 'U', label: 'Unión libre' },
  { key: 'D', label: 'Divorciado/a' },
  { key: 'V', label: 'Viudo/a' },
];

const birthdateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Distintas apps del ecosistema guardaron sexo/estado civil con convenciones
// distintas (código de una letra o texto completo). Se normaliza al código
// que usa esta pantalla para poder preseleccionar el valor correcto.
function normalizeGender(value?: string | null): string {
  const v = (value || '').toUpperCase();
  if (v === 'M' || v === 'MASCULINO') return 'M';
  if (v === 'F' || v === 'FEMENINO') return 'F';
  if (v === 'O' || v === 'OTRO') return 'O';
  return '';
}

function normalizeCivilStatus(value?: string | null): string {
  const v = (value || '').toUpperCase();
  if (v === 'S' || v.startsWith('SOLTERO')) return 'S';
  if (v === 'C' || v === 'M' || v.startsWith('CASADO')) return 'C';
  if (v === 'U' || v.startsWith('UNION')) return 'U';
  if (v === 'D' || v.startsWith('DIVORCIADO')) return 'D';
  if (v === 'V' || v.startsWith('VIUDO')) return 'V';
  return '';
}

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export default function EditProfileScreen() {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [firstSurname, setFirstSurname] = useState('');
  const [secondSurname, setSecondSurname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [genderPickerOpen, setGenderPickerOpen] = useState(false);
  const [civilPickerOpen, setCivilPickerOpen] = useState(false);

  const inputStyle = { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border };

  const load = useCallback(async () => {
    try {
      const profile = await api.getAuthorizaProfile();
      const natural = profile?.basicData?.naturalPersonData;
      setFirstName(natural?.firstName || '');
      setSecondName(natural?.secondName || '');
      setFirstSurname(natural?.firstSurname || '');
      setSecondSurname(natural?.secondSurname || '');
      setBirthdate(toDateInputValue(natural?.birthDate));
      setGender(normalizeGender(natural?.sex));
      setCivilStatus(normalizeCivilStatus(natural?.maritalStatus));
      setPhone(natural?.phone || '');
    } catch (err: any) {
      alertDialog('No se pudo cargar tu perfil', err.message || 'Intenta de nuevo');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const validate = (): string | null => {
    if (!firstName.trim()) return 'Ingresa tu primer nombre';
    if (!firstSurname.trim()) return 'Ingresa tu primer apellido';
    if (!birthdate.trim() || !birthdateRegex.test(birthdate.trim())) return 'Ingresa tu fecha de nacimiento (AAAA-MM-DD)';
    if (!gender) return 'Selecciona tu sexo';
    if (!civilStatus) return 'Selecciona tu estado civil';
    if (!phone.trim()) return 'Ingresa tu teléfono';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { alertDialog('Revisa los datos', err); return; }

    setSaving(true);
    try {
      await api.updateAuthorizaProfile({
        firstName: firstName.trim(),
        secondName: secondName.trim() || undefined,
        firstSurname: firstSurname.trim(),
        secondSurname: secondSurname.trim() || undefined,
        birthDate: birthdate.trim(),
        sex: gender,
        maritalStatus: civilStatus,
        phone: phone.trim(),
      });
      alertDialog('Datos actualizados', 'Tu perfil se actualizó correctamente.');
      router.canGoBack() ? router.back() : router.push('/(tabs)/profile');
    } catch (e: any) {
      alertDialog('No se pudo guardar', e.message || 'Intenta de nuevo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/profile')}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Editar mis datos</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Primer nombre *</Text>
              <TextInput style={[styles.input, inputStyle]} value={firstName} onChangeText={setFirstName} placeholderTextColor={theme.inputPlaceholder} />
            </View>
            <View style={styles.half}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Segundo nombre</Text>
              <TextInput style={[styles.input, inputStyle]} value={secondName} onChangeText={setSecondName} placeholder="(opcional)" placeholderTextColor={theme.inputPlaceholder} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Primer apellido *</Text>
              <TextInput style={[styles.input, inputStyle]} value={firstSurname} onChangeText={setFirstSurname} placeholderTextColor={theme.inputPlaceholder} />
            </View>
            <View style={styles.half}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Segundo apellido</Text>
              <TextInput style={[styles.input, inputStyle]} value={secondSurname} onChangeText={setSecondSurname} placeholder="(opcional)" placeholderTextColor={theme.inputPlaceholder} />
            </View>
          </View>

          <Text style={[styles.label, { color: theme.textMuted }]}>Fecha de nacimiento *</Text>
          <TextInput style={[styles.input, inputStyle]} value={birthdate} onChangeText={setBirthdate} placeholder="AAAA-MM-DD" placeholderTextColor={theme.inputPlaceholder} keyboardType="number-pad" maxLength={10} />

          <Text style={[styles.label, { color: theme.textMuted }]}>Sexo *</Text>
          <TouchableOpacity style={[styles.input, inputStyle, styles.selector]} onPress={() => { setGenderPickerOpen(!genderPickerOpen); setCivilPickerOpen(false); }}>
            <Text style={{ color: gender ? theme.inputText : theme.inputPlaceholder }}>{GENDERS.find(g => g.key === gender)?.label || 'Seleccionar sexo'}</Text>
            <Ionicons name={genderPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
          </TouchableOpacity>
          {genderPickerOpen && (
            <View style={[styles.optionList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {GENDERS.map((g) => (
                <TouchableOpacity key={g.key} style={styles.optionItem} onPress={() => { setGender(g.key); setGenderPickerOpen(false); }}>
                  <Text style={{ color: gender === g.key ? theme.accent : theme.text, fontWeight: gender === g.key ? '800' : '500' }}>{g.label}</Text>
                  {gender === g.key && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: theme.textMuted }]}>Estado civil *</Text>
          <TouchableOpacity style={[styles.input, inputStyle, styles.selector]} onPress={() => { setCivilPickerOpen(!civilPickerOpen); setGenderPickerOpen(false); }}>
            <Text style={{ color: civilStatus ? theme.inputText : theme.inputPlaceholder }}>{CIVIL_STATUSES.find(c => c.key === civilStatus)?.label || 'Seleccionar estado civil'}</Text>
            <Ionicons name={civilPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
          </TouchableOpacity>
          {civilPickerOpen && (
            <View style={[styles.optionList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {CIVIL_STATUSES.map((c) => (
                <TouchableOpacity key={c.key} style={styles.optionItem} onPress={() => { setCivilStatus(c.key); setCivilPickerOpen(false); }}>
                  <Text style={{ color: civilStatus === c.key ? theme.accent : theme.text, fontWeight: civilStatus === c.key ? '800' : '500' }}>{c.label}</Text>
                  {civilStatus === c.key && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: theme.textMuted }]}>Teléfono *</Text>
          <TextInput style={[styles.input, inputStyle]} value={phone} onChangeText={setPhone} placeholder="300 123 4567" placeholderTextColor={theme.inputPlaceholder} keyboardType="phone-pad" />

          <TouchableOpacity style={[styles.button, { backgroundColor: theme.accent, marginTop: 24 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={theme.accentText} /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.accentText} />
                <Text style={[styles.buttonText, { color: theme.accentText }]}>Guardar cambios</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 52 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  content: { paddingHorizontal: 24, paddingBottom: 48 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, borderWidth: 1.5,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionList: { borderRadius: 12, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 16 },
  buttonText: { fontSize: 16, fontWeight: '800' },
});
