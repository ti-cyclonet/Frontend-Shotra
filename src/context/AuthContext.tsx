import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const TOKEN_KEY = 'shotra_auth_token';
const AUTHORIZA_URL = process.env.EXPO_PUBLIC_AUTHORIZA_URL || 'http://localhost:3000/api';

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
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
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
    // Autenticar contra Authoriza (ecosistema CycloNet)
    const res = await fetch(`${AUTHORIZA_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strUserName: email, strPassword: password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Credenciales incorrectas');
    }

    const data = await res.json();
    const token = data.access_token || data.token;

    if (!token) throw new Error('No se recibio token de autenticacion');

    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setUser({ token, ...data.user });
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
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
