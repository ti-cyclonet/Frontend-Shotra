import { Tabs } from 'expo-router';
import { useTheme } from '../../src/context/ThemeProvider';
import { GlassTabBar } from '../../src/components/navigation/GlassTabBar';

export default function TabsLayout() {
  const { theme } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="my-requests" options={{ title: 'Solicitudes' }} />
      <Tabs.Screen name="create" options={{ title: 'Publicar' }} />
      <Tabs.Screen name="messages" options={{ title: 'Chat' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
