import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4100/api';
const TOKEN_KEY = 'shotra_auth_token';

// SecureStore no funciona en web — fallback a localStorage
async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(TOKEN_KEY, token); return; }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') { localStorage.removeItem(TOKEN_KEY); return; }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `Error ${res.status}` }));
    if (res.status === 403) {
      throw new Error(error.message || 'No tienes acceso a esta aplicacion. Necesitas un plan de SHOTRA activo.');
    }
    throw new Error(error.message || error.error || `Error ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

/**
 * Sube un archivo vía multipart/form-data. `file` es un objeto con uri/name/type
 * (formato de expo-image-picker / DocumentPicker). Devuelve la respuesta del server.
 */
async function upload<T>(endpoint: string, file: { uri: string; name: string; type: string }): Promise<T> {
  const token = await getToken();
  const form = new FormData();

  if (Platform.OS === 'web') {
    // En web, uri suele ser un blob/data URL: convertir a Blob real
    const blob = await fetch(file.uri).then((r) => r.blob());
    form.append('file', blob, file.name);
  } else {
    // En nativo, RN acepta el objeto { uri, name, type }
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  }

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // NO fijar Content-Type: fetch pone el boundary automáticamente

  const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers, body: form });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `Error ${res.status}` }));
    throw new Error(error.message || `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  upload,
};
