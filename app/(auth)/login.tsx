import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, Image, Animated, Easing, ActivityIndicator, Pressable,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme, THEMES, ThemeKey } from '../../src/context/ThemeProvider';

const THEME_ORDER: ThemeKey[] = ['graphite', 'black', 'crimson'];
const useNative = Platform.OS !== 'web';

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme, themeKey, setTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusField, setFocusField] = useState<string | null>(null);

  // Animaciones de entrada
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const themeAnim = useRef(new Animated.Value(0)).current;
  // Glow pulsante detras del logo
  const glow = useRef(new Animated.Value(0)).current;
  // Escala del boton al presionar
  const btnScale = useRef(new Animated.Value(1)).current;
  // Shake al error
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.spring(logoAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: useNative }),
      Animated.spring(formAnim, { toValue: 1, friction: 8, tension: 55, useNativeDriver: useNative }),
      Animated.spring(themeAnim, { toValue: 1, friction: 8, tension: 55, useNativeDriver: useNative }),
    ]).start();

    // Glow en loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(glow, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      ]),
    ).start();
  }, [logoAnim, formAnim, themeAnim, glow]);

  const triggerShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: useNative }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: useNative }),
      Animated.timing(shake, { toValue: 0.6, duration: 60, useNativeDriver: useNative }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: useNative }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Ingresa correo y contrasena');
      triggerShake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesion');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const pressIn = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: useNative }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, friction: 4, useNativeDriver: useNative }).start();

  const logoTranslate = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
  const logoScale = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const formTranslate = formAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const themeTranslate = themeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });
  // Glow mas tenue; en el tema claro se reduce aun mas para que no parezca una mancha
  const isLightTheme = themeKey === 'graphite';
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: isLightTheme ? [0.04, 0.12] : [0.12, 0.32],
  });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.0] });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Glow pulsante detras del logo */}
        <View style={styles.logoZone}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              { backgroundColor: theme.accent, opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
          <Animated.Image
            source={require('../../assets/logo_gris.png')}
            style={[styles.logo, { opacity: logoAnim, transform: [{ translateY: logoTranslate }, { scale: logoScale }] }]}
            resizeMode="contain"
          />
        </View>

        <Animated.Text style={[styles.tagline, { color: theme.textMuted, opacity: logoAnim }]}>
          Conectamos soluciones con quienes las necesitan
        </Animated.Text>

        <Animated.View
          style={[styles.form, { opacity: formAnim, transform: [{ translateY: formTranslate }, { translateX: shakeX }] }]}
        >
          {/* Campo correo */}
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.inputBg, borderColor: focusField === 'email' ? theme.accent : theme.border },
              focusField === 'email' && styles.inputWrapFocused,
            ]}
          >
            <Ionicons name="mail-outline" size={20} color={focusField === 'email' ? theme.accent : theme.inputPlaceholder} />
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Correo electronico"
              placeholderTextColor={theme.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusField('email')}
              onBlur={() => setFocusField(null)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Campo contrasena */}
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.inputBg, borderColor: focusField === 'pass' ? theme.accent : theme.border },
              focusField === 'pass' && styles.inputWrapFocused,
            ]}
          >
            <Ionicons name="lock-closed-outline" size={20} color={focusField === 'pass' ? theme.accent : theme.inputPlaceholder} />
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Contrasena"
              placeholderTextColor={theme.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusField('pass')}
              onBlur={() => setFocusField(null)}
              secureTextEntry
            />
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color="#ff5252" />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              style={[styles.button, { backgroundColor: theme.accent }]}
              onPress={handleLogin}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.accentText} />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color={theme.accentText} />
                  <Text style={[styles.buttonText, { color: theme.accentText }]}>Iniciar Sesion</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Selector de tema */}
        <Animated.View style={[styles.themeSection, { opacity: themeAnim, transform: [{ translateY: themeTranslate }] }]}>
          <View style={styles.themeHeader}>
            <Ionicons name="color-palette-outline" size={16} color={theme.textMuted} />
            <Text style={[styles.themeLabel, { color: theme.textMuted }]}>Tema de la aplicacion</Text>
          </View>
          <View style={styles.themeRow}>
            {THEME_ORDER.map((key) => {
              const t = THEMES[key];
              const selected = themeKey === key;
              return <ThemeSwatch key={key} t={t} selected={selected} accent={theme.accent} text={theme.text} textMuted={theme.textMuted} onPress={() => setTheme(key)} />;
            })}
          </View>
        </Animated.View>

        <Text style={[styles.footer, { color: theme.textMuted }]}>Powered by CycloNet S.A.S.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Swatch de tema con animacion al seleccionar */
function ThemeSwatch({
  t, selected, accent, text, textMuted, onPress,
}: {
  t: typeof THEMES[ThemeKey];
  selected: boolean;
  accent: string;
  text: string;
  textMuted: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(selected ? 1 : 0.9)).current;
  const check = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: selected ? 1.08 : 0.92, friction: 6, useNativeDriver: useNative }).start();
    Animated.timing(check, { toValue: selected ? 1 : 0, duration: 180, useNativeDriver: useNative }).start();
  }, [selected, scale, check]);

  return (
    <TouchableOpacity style={styles.themeOption} onPress={onPress} activeOpacity={0.85}>
      <Animated.View
        style={[
          styles.swatch,
          { backgroundColor: t.swatch, transform: [{ scale }] },
          selected && { borderColor: accent, borderWidth: 3 },
        ]}
      >
        <Animated.View style={{ opacity: check, transform: [{ scale: check }] }}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
        </Animated.View>
      </Animated.View>
      <Text style={[styles.swatchLabel, { color: selected ? text : textMuted, fontWeight: selected ? '800' : '600' }]}>
        {t.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoZone: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  glow: {
    position: 'absolute',
    width: 200,
    height: 90,
    borderRadius: 100,
    ...(Platform.OS === 'web' ? { filter: 'blur(40px)' } as any : {}),
  },
  logo: { width: '100%', maxWidth: 320, height: 112 },
  tagline: { fontSize: 14, marginTop: 16, marginBottom: 40, textAlign: 'center' },
  form: { width: '100%', maxWidth: 340 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  inputWrapFocused: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    // Quitar el outline azul por defecto del navegador en web
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
  error: { color: '#ff5252', fontSize: 13, textAlign: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '800' },
  // Theme picker
  themeSection: { width: '100%', maxWidth: 340, marginTop: 36, alignItems: 'center' },
  themeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  themeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  themeRow: { flexDirection: 'row', justifyContent: 'center', gap: 22 },
  themeOption: { alignItems: 'center', gap: 10 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchLabel: { fontSize: 12 },
  footer: { fontSize: 11, marginTop: 40 },
});
