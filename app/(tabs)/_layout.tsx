import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../src/context/ThemeProvider';
import { GlassTabBar } from '../../src/components/navigation/GlassTabBar';
import { SideRail, RAIL_WIDTH } from '../../src/components/navigation/SideRail';
import { DetailPane } from '../../src/web/DetailPane';
import { useIsWide, setShellActive, closeDetail } from '../../src/web/nav';

export default function TabsLayout() {
  const { theme } = useTheme();
  // Web ancha: barra lateral | lista de la pestaña | panel de detalle (como
  // WhatsApp Web). En el celular, la barra inferior de siempre.
  const wide = useIsWide();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();

  useEffect(() => {
    setShellActive(wide && focused);
  }, [wide, focused]);

  // Al angostar la ventana el panel desaparece: no dejar un detalle "oculto"
  useEffect(() => {
    if (!wide) closeDetail();
  }, [wide]);

  const listWidth = Math.round(Math.min(460, Math.max(360, width * 0.3)));

  // La misma estructura en ambos modos para que las pestañas no se monten de
  // nuevo (y pierdan su estado) al cambiar el ancho de la ventana.
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.background }}>
      <View
        style={
          wide
            ? { width: RAIL_WIDTH + listWidth, borderRightWidth: 1, borderRightColor: theme.border }
            : { flex: 1 }
        }
      >
        <Tabs
          tabBar={(props) => (wide ? <SideRail {...props} /> : <GlassTabBar {...props} />)}
          screenOptions={{
            headerShown: false,
            tabBarPosition: wide ? 'left' : 'bottom',
            sceneStyle: { backgroundColor: theme.background },
          }}
        >
          <Tabs.Screen name="feed" options={{ title: 'Explorar' }} />
          <Tabs.Screen name="my-requests" options={{ title: 'Solicitudes' }} />
          <Tabs.Screen name="create" options={{ title: 'Publicar' }} />
          <Tabs.Screen name="messages" options={{ title: 'Chat' }} />
          <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
        </Tabs>
      </View>
      {wide && (
        <View style={{ flex: 1 }}>
          <DetailPane />
        </View>
      )}
    </View>
  );
}
