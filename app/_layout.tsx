import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import { useEffect } from 'react';
import { AuthProvider } from '../src/context/AuthContext';
import { NotificationsProvider } from '../src/context/NotificationsContext';
import { DialogProvider } from '../src/context/DialogProvider';
import { ThemeProvider, useTheme } from '../src/context/ThemeProvider';

function ThemedStack() {
  const { theme } = useTheme();

  // En web, pintar el fondo del documento y quitar el outline azul por defecto de los inputs
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.background;
      const root = document.getElementById('root');
      if (root) root.style.backgroundColor = theme.background;

      const STYLE_ID = 'shotra-web-overrides';
      if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
          input, textarea, select, [contenteditable] {
            outline: none !important;
            box-shadow: none !important;
          }
          input:focus, textarea:focus, select:focus {
            outline: none !important;
          }
          /* Evitar el fondo blanco del autofill del navegador */
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-text-fill-color: #ffffff !important;
            -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
            box-shadow: 0 0 0 1000px transparent inset !important;
            transition: background-color 9999s ease-in-out 0s !important;
            caret-color: #ffffff !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [theme.background]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.key === 'graphite' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <DialogProvider>
        <AuthProvider>
          <NotificationsProvider>
            <ThemedStack />
          </NotificationsProvider>
        </AuthProvider>
      </DialogProvider>
    </ThemeProvider>
  );
}
