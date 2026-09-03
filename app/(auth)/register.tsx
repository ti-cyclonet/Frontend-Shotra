import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Pressable,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeProvider';
import { alertDialog } from '../../src/services/dialog';

// Tipos de documento (persona natural) sincronizados con Authoriza
const DOC_TYPES = [
  { key: 'CC', label: 'Cédula de ciudadanía' },
  { key: 'CE', label: 'Cédula de extranjería' },
  { key: 'TI', label: 'Tarjeta de identidad' },
  { key: 'PA', label: 'Pasaporte' },
  { key: 'NIT', label: 'NIT' },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { register } = useAuth();
  const { theme } = useTheme();

  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [firstSurname, setFirstSurname] = useState('');
  const [secondSurname, setSecondSurname] = useState('');
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const inputStyle = { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.border };

  const validate = (): string | null => {
    if (!firstName.trim()) return 'Ingresa tu primer nombre';
    if (!firstSurname.trim()) return 'Ingresa tu primer apellido';
    if (!documentNumber.trim()) return 'Ingresa tu número de documento';
    if (!emailRegex.test(email.trim())) return 'Ingresa un correo válido';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (password !== confirm) return 'Las contraseñas no coinciden';
    return null;
  };

  const handleRegister = async () => {
    const err = validate();
    if (err) { alertDialog('Revisa los datos', err); return; }

    setLoading(true);
    try {
      const res = await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        secondName: secondName.trim() || undefined,
        firstSurname: firstSurname.trim(),
        secondSurname: secondSurname.trim() || undefined,
        documentType,
        documentNumber: documentNumber.trim(),
        phone: phone.trim() || undefined,
      });
      setDone(true);
      if (res.verificationRequired === false) {
        alertDialog('Cuenta lista', res.message || 'Ya puedes iniciar sesión.');
      }
    } catch (e: any) {
      alertDialog('No se pudo registrar', e.message || 'Intenta de nuevo');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de confirmación tras registrar
  if (done) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <View style={[styles.doneIcon, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
          <Ionicons name="mail-unread-outline" size={40} color={theme.accent} />
        </View>
        <Text style={[styles.doneTitle, { color: theme.text }]}>Revisa tu correo</Text>
        <Text style={[styles.doneText, { color: theme.textMuted }]}>
          Te enviamos un enlace de verificación a{'\n'}<Text style={{ color: theme.text, fontWeight: '700' }}>{email}</Text>.
          Ábrelo para activar tu cuenta y luego inicia sesión.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.accent }]} onPress={() => router.replace('/(auth)/login')}>
          <Text style={[styles.buttonText, { color: theme.accentText }]}>Ir a iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => router.replace('/(auth)/login')}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Volver</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Crear cuenta</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Regístrate para ofrecer o solicitar servicios en SHOTRA</Text>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Primer nombre *</Text>
            <TextInput style={[styles.input, inputStyle]} value={firstName} onChangeText={setFirstName} placeholder="Juan" placeholderTextColor={theme.inputPlaceholder} />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Segundo nombre</Text>
            <TextInput style={[styles.input, inputStyle]} value={secondName} onChangeText={setSecondName} placeholder="(opcional)" placeholderTextColor={theme.inputPlaceholder} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Primer apellido *</Text>
            <TextInput style={[styles.input, inputStyle]} value={firstSurname} onChangeText={setFirstSurname} placeholder="Pérez" placeholderTextColor={theme.inputPlaceholder} />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Segundo apellido</Text>
            <TextInput style={[styles.input, inputStyle]} value={secondSurname} onChangeText={setSecondSurname} placeholder="(opcional)" placeholderTextColor={theme.inputPlaceholder} />
          </View>
        </View>

        <Text style={[styles.label, { color: theme.textMuted }]}>Tipo de documento *</Text>
        <TouchableOpacity style={[styles.input, inputStyle, styles.selector]} onPress={() => setDocPickerOpen(!docPickerOpen)}>
          <Text style={{ color: theme.inputText }}>{DOC_TYPES.find(d => d.key === documentType)?.label}</Text>
          <Ionicons name={docPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
        </TouchableOpacity>
        {docPickerOpen && (
          <View style={[styles.docList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {DOC_TYPES.map((d) => (
              <TouchableOpacity key={d.key} style={styles.docItem} onPress={() => { setDocumentType(d.key); setDocPickerOpen(false); }}>
                <Text style={{ color: documentType === d.key ? theme.accent : theme.text, fontWeight: documentType === d.key ? '800' : '500' }}>{d.label}</Text>
                {documentType === d.key && <Ionicons name="checkmark" size={16} color={theme.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: theme.textMuted }]}>Número de documento *</Text>
        <TextInput style={[styles.input, inputStyle]} value={documentNumber} onChangeText={setDocumentNumber} placeholder="1234567890" placeholderTextColor={theme.inputPlaceholder} keyboardType="number-pad" />

        <Text style={[styles.label, { color: theme.textMuted }]}>Teléfono</Text>
        <TextInput style={[styles.input, inputStyle]} value={phone} onChangeText={setPhone} placeholder="(opcional)" placeholderTextColor={theme.inputPlaceholder} keyboardType="phone-pad" />

        <Text style={[styles.label, { color: theme.textMuted }]}>Correo electrónico *</Text>
        <TextInput style={[styles.input, inputStyle]} value={email} onChangeText={setEmail} placeholder="tucorreo@ejemplo.com" placeholderTextColor={theme.inputPlaceholder} keyboardType="email-address" autoCapitalize="none" />

        <Text style={[styles.label, { color: theme.textMuted }]}>Contraseña *</Text>
        <TextInput style={[styles.input, inputStyle]} value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" placeholderTextColor={theme.inputPlaceholder} secureTextEntry />

        <Text style={[styles.label, { color: theme.textMuted }]}>Confirmar contraseña *</Text>
        <TextInput style={[styles.input, inputStyle]} value={confirm} onChangeText={setConfirm} placeholder="Repite tu contraseña" placeholderTextColor={theme.inputPlaceholder} secureTextEntry />

        <Pressable style={[styles.button, { backgroundColor: theme.accent, marginTop: 24 }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.accentText} /> : (
            <>
              <Ionicons name="person-add-outline" size={18} color={theme.accentText} />
              <Text style={[styles.buttonText, { color: theme.accentText }]}>Crear cuenta</Text>
            </>
          )}
        </Pressable>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/(auth)/login')}>
          <Text style={[styles.loginText, { color: theme.textMuted }]}>
            ¿Ya tienes cuenta? <Text style={{ color: theme.accent, fontWeight: '800' }}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  content: { padding: 24, paddingTop: 52, paddingBottom: 48 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, borderWidth: 1.5,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docList: { borderRadius: 12, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  docItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 16 },
  buttonText: { fontSize: 16, fontWeight: '800' },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 14 },
  // done
  doneIcon: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, marginBottom: 20 },
  doneTitle: { fontSize: 22, fontWeight: '900', marginBottom: 12 },
  doneText: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
});
