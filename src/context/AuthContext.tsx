import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { LEGAL_VERSIONS } from '../legal/shotra-legal';

const TOKEN_KEY = 'shotra_auth_token';
const AUTHORIZA_URL = process.env.EXPO_PUBLIC_AUTHORIZA_URL || 'http://localhost:3000/api';

// SecureStore no funciona en web — usamos localStorage como fallback
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  secondName?: string;
  firstSurname: string;
  secondSurname?: string;
  documentType?: string;
  documentNumber?: string;
  phone: string;
  birthdate?: string;
  gender?: string;
  civilStatus?: string;
  // Aceptación de Términos de SHOTRA y autorización de datos (Ley 1581/2012)
  acceptTerms: boolean;
  acceptHabeasData: boolean;
  termsVersion: string;
  habeasDataVersion: string;
}

/**
 * Error del login cuando correo y contraseña son correctos pero la cuenta
 * CycloNet aún no tiene Shotra (usa otra app del ecosistema): el login ofrece
 * activarlo. Se identifica por `code` (no por clase: con Babel, extender Error
 * puede romper instanceof).
 */
export const NO_SHOTRA_PLAN = 'NO_SHOTRA_PLAN';

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  user: any;
  login: (email: string, password: string) => Promise<void>;
  /** Activa Shotra en una cuenta CycloNet existente (acepta términos + datos). */
  activateShotra: (email: string, password: string) => Promise<string>;
  register: (data: RegisterData) => Promise<{ message: string; verificationRequired?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await storage.getItem(TOKEN_KEY);
      if (token) {
        // TODO: validar token con el backend (GET /profiles/me)
        setUser({ token });
      }
    } catch {
      // Token invalido o expirado
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${AUTHORIZA_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, applicationName: 'Shotra' }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      // Authoriza solo responde UNAUTHORIZED después de validar la contraseña:
      // la cuenta existe y es de esta persona, pero no tiene Shotra todavía.
      if (res.status === 401 && error.message === 'UNAUTHORIZED') {
        throw Object.assign(new Error('Tu cuenta CycloNet aún no tiene Shotra activo.'), { code: NO_SHOTRA_PLAN });
      }
      throw new Error(error.message || 'Credenciales incorrectas');
    }

    const data = await res.json();
    const token = data.access_token || data.token;

    if (!token) throw new Error('No se recibio token de autenticacion');

    // Obtener/crear perfil en Shotra
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4100/api';
    const profileRes = await fetch(`${API_URL}/profiles/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    await storage.setItem(TOKEN_KEY, token);
    const profileData = profileRes.ok ? await profileRes.json() : null;
    setUser({ token, profile: profileData, ...data.user });
  }

  async function activateShotra(email: string, password: string) {
    const res = await fetch(`${AUTHORIZA_URL}/auth/activate-shotra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        acceptTerms: true,
        acceptHabeasData: true,
        termsVersion: LEGAL_VERSIONS.terms,
        habeasDataVersion: LEGAL_VERSIONS.habeasData,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof body.message === 'string' ? body.message : body.message?.message;
      throw new Error(msg || 'No se pudo activar Shotra en tu cuenta');
    }
    return String(body.message || 'Se activó Shotra en tu cuenta CycloNet.');
  }

  async function register(data: RegisterData) {
    const res = await fetch(`${AUTHORIZA_URL}/auth/register-shotra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.message || 'No se pudo completar el registro');
    }
    return { message: body.message, verificationRequired: body.verificationRequired };
  }

  async function logout() {
    // Antes de borrar la sesión (el DELETE necesita el token de acceso): el
    // dispositivo deja de estar vinculado a esta cuenta, así no le siguen
    // llegando sus notificaciones con otra cuenta o sin sesión.
    await unlinkPushToken();
    await storage.removeItem(TOKEN_KEY);
    setUser(null);
    router.replace('/(auth)/login');
  }

  async function unlinkPushToken() {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: pushToken } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4100/api';
        const token = await storage.getItem(TOKEN_KEY);
        if (token && pushToken) {
          await fetch(`${API_URL}/push-tokens`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ token: pushToken }),
          }).catch(() => {});
        }
      }
    } catch {
      // Sin permiso / sin token: no hay nada que desvincular
    }
    Notifications.dismissAllNotificationsAsync().catch(() => {});
    Notifications.setBadgeCountAsync(0).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, loading, user, login, activateShotra, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
