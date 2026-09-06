import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ThemeKey = 'graphite' | 'black' | 'crimson';

export interface Theme {
  key: ThemeKey;
  label: string;
  background: string;   // fondo principal de pantallas
  surface: string;      // tarjetas / inputs
  surfaceAlt: string;   // inputs mas oscuros / secundarios
  border: string;       // bordes sutiles
  text: string;         // texto principal
  textMuted: string;    // texto secundario
  inputBg: string;      // fondo de los campos de texto
  inputText: string;    // texto dentro de los campos
  inputPlaceholder: string; // placeholder de los campos
  accent: string;       // color de marca / botones
  accentText: string;   // texto sobre el acento
  accentDark: string;   // variante oscura del acento (fin del gradiente / hover)
  accentSoft: string;   // tinte suave del acento (fondos de chips, badges)
  danger: string;       // rojo de error / destructivo
  success: string;      // verde de exito
  warning: string;      // ambar de advertencia
  tabBar: string;       // fondo de la barra de pestanas
  swatch: string;       // color representativo en el selector
  // Efecto vidrio (glassmorphism) para tarjetas
  glass: string;        // fondo translucido de tarjetas
  glassStrong: string;  // fondo translucido mas marcado (secciones)
  glassBorder: string;  // borde luminoso translucido
  glassHighlight: string; // linea/brillo superior
}

export const THEMES: Record<ThemeKey, Theme> = {
  graphite: {
    key: 'graphite',
    label: 'Claro',
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceAlt: '#ececec',
    border: '#e0e0e0',
    text: '#111111',
    textMuted: '#6b6b6b',
    inputBg: '#ffffff',
    inputText: '#111111',
    inputPlaceholder: '#9a9a9a',
    accent: '#990000',      // rojo de la paleta como acento sobre fondo claro
    accentText: '#ffffff',
    accentDark: '#6b0000',  // fin del gradiente del FAB / CTA
    accentSoft: 'rgba(153,0,0,0.10)', // tinte para chips y badges
    danger: '#dc2626',
    success: '#16a34a',
    warning: '#d97706',
    tabBar: '#ffffff',
    swatch: '#f5f5f5',
    // Tema claro: tarjetas blancas que resaltan sobre el fondo gris #f5f5f5,
    // con borde sutil oscuro (efecto "tarjeta elevada" en vez de vidrio oscuro).
    glass: '#ffffff',
    glassStrong: '#fbfbfb',
    glassBorder: 'rgba(0,0,0,0.08)',
    glassHighlight: 'rgba(0,0,0,0.04)',
  },
  black: {
    key: 'black',
    label: 'Negro',
    background: '#000000',
    surface: '#111111',
    surfaceAlt: '#1a1a1a',
    border: '#262626',
    text: '#ffffff',
    textMuted: '#aaaaaa',
    inputBg: '#1a1a1a',
    inputText: '#ffffff',
    inputPlaceholder: '#777777',
    accent: '#4ecdc4',
    accentText: '#04211f',
    accentDark: '#2f9d95',
    accentSoft: 'rgba(78,205,196,0.14)',
    danger: '#ff6b6b',
    success: '#4ecdc4',
    warning: '#ffd166',
    tabBar: '#000000',
    swatch: '#000000',
    glass: 'rgba(255,255,255,0.045)',
    glassStrong: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.1)',
    glassHighlight: 'rgba(255,255,255,0.16)',
  },
  crimson: {
    key: 'crimson',
    label: 'Carmesi',
    background: '#990000',
    surface: '#b31217',
    surfaceAlt: '#7a0000',
    border: '#7a0000',
    text: '#ffffff',
    textMuted: '#f2c9c9',
    inputBg: '#ffffff',
    inputText: '#1a1a1a',
    inputPlaceholder: '#999999',
    accent: '#141414',
    accentText: '#ffffff',
    accentDark: '#000000',
    accentSoft: 'rgba(0,0,0,0.20)',
    danger: '#ffb3b3',
    success: '#7ee0d8',
    warning: '#ffd166',
    tabBar: 'rgba(0,0,0,0.35)',
    swatch: '#990000',
    glass: 'rgba(255,255,255,0.1)',
    glassStrong: 'rgba(255,255,255,0.16)',
    glassBorder: 'rgba(255,255,255,0.28)',
    glassHighlight: 'rgba(255,255,255,0.4)',
  },
};

const STORAGE_KEY = 'shotra_theme';

interface ThemeContextValue {
  theme: Theme;
  themeKey: ThemeKey;
  setTheme: (key: ThemeKey) => void;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function loadStored(): Promise<ThemeKey | null> {
  try {
    const v = Platform.OS === 'web'
      ? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null)
      : await SecureStore.getItemAsync(STORAGE_KEY);
    if (v && (v === 'graphite' || v === 'black' || v === 'crimson')) return v;
    return null;
  } catch {
    return null;
  }
}

async function persist(key: ThemeKey) {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, key);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, key);
    }
  } catch {
    // no critico
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('black');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadStored().then((k) => {
      if (k) setThemeKey(k);
      setReady(true);
    });
  }, []);

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeKey(key);
    persist(key);
  }, []);

  const value: ThemeContextValue = {
    theme: THEMES[themeKey],
    themeKey,
    setTheme,
    ready,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/**
 * Devuelve estilos con efecto vidrio (glassmorphism) listos para el tema actual.
 * card: tarjeta translucida iluminada. cardStrong: variante mas marcada.
 * En web agrega backdrop-filter (desenfoque) para un vidrio real.
 */
export function useGlass() {
  const { theme, themeKey } = useTheme();
  const isLight = themeKey === 'graphite';

  // En temas oscuros: vidrio real con desenfoque. En tema claro: tarjeta blanca elevada.
  const blur = Platform.OS === 'web' && !isLight
    ? ({ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } as any)
    : {};

  const elevation = isLight
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }
    : {};

  return {
    theme,
    card: {
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      ...(isLight ? {} : { borderTopColor: theme.glassHighlight }),
      ...blur,
      ...elevation,
    },
    cardStrong: {
      backgroundColor: theme.glassStrong,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      ...(isLight ? {} : { borderTopColor: theme.glassHighlight }),
      ...blur,
      ...elevation,
    },
    // Borde/superficie sutil para chips e inputs internos
    chip: {
      backgroundColor: isLight ? theme.surfaceAlt : theme.glass,
      borderWidth: 1,
      borderColor: theme.glassBorder,
    },
  };
}
