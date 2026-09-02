import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { router } from 'expo-router';

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

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  user: any;
  login: (email: string, password: string) => Promise<void>;
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
      if (res.status === 401 && error.message === 'UNAUTHORIZED') {
        throw new Error('No tienes un plan de SHOTRA activo. Registrate para obtener acceso.');
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

  async function logout() {
    await storage.removeItem(TOKEN_KEY);
    setUser(null);
    router.replace('/(auth)/login');
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, loading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
