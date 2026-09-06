import { useState } from 'react';
import { View, Pressable, StyleSheet, Platform, Modal } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeProvider';
import { radius, spacing, shadow, typography, motion } from '../../theme/tokens';
import { Text } from '../ui/Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Iconos por ruta (activo / inactivo estilo Ionicons filled vs outline)
const TAB_META: Record<string, { icon: IoniconName; iconOutline: IoniconName; label: string }> = {
  feed: { icon: 'search', iconOutline: 'search-outline', label: 'Explorar' },
  'my-requests': { icon: 'list', iconOutline: 'list-outline', label: 'Solicitudes' },
  messages: { icon: 'chatbubbles', iconOutline: 'chatbubbles-outline', label: 'Chat' },
  profile: { icon: 'person', iconOutline: 'person-outline', label: 'Perfil' },
};

// Orden visual: 2 tabs | FAB | 2 tabs. "create" se maneja con el FAB.
const LEFT = ['feed', 'my-requests'];
const RIGHT = ['messages', 'profile'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme, themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [actionsOpen, setActionsOpen] = useState(false);

  const isLight = themeKey === 'graphite';
  const rotation = useSharedValue(0);

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggleActions = () => {
    const next = !actionsOpen;
    setActionsOpen(next);
    rotation.value = withSpring(next ? 45 : 0, motion.spring);
  };

  const closeActions = () => {
    setActionsOpen(false);
    rotation.value = withSpring(0, motion.spring);
  };

  const currentRoute = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const isFocused = currentRoute === name;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(name);
  };

  const glassBg =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any)
      : {};

  const renderTab = (name: string) => {
    const meta = TAB_META[name];
    if (!meta) return null;
    const focused = currentRoute === name;
    return <TabButton key={name} meta={meta} focused={focused} accent={theme.accent} muted={theme.textMuted} onPress={() => go(name)} />;
  };

  return (
    <>
      {/* Overlay de acciones rapidas */}
      <Modal visible={actionsOpen} transparent animationType="none" onRequestClose={closeActions}>
        <Pressable style={styles.overlay} onPress={closeActions}>
          <View style={[styles.overlayBg, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
          <View style={[styles.actionsRow, { marginBottom: 96 + insets.bottom }]}>
            <QuickAction
              icon="add-circle"
              label="Publicar"
              index={0}
              onPress={() => {
                closeActions();
                router.push('/(tabs)/create');
              }}
              accent={theme.accent}
              accentDark={theme.accentDark}
              accentText={theme.accentText}
              large
            />
          </View>
        </Pressable>
      </Modal>

      {/* Barra glass */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.tabBar,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, spacing[2]),
          },
          glassBg,
        ]}
      >
        {LEFT.map(renderTab)}

        {/* FAB central de gradiente */}
        <AnimatedPressable onPress={toggleActions} style={styles.fabWrap}>
          <LinearGradient
            colors={actionsOpen ? [theme.textMuted, theme.textMuted] : [theme.accent, theme.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fab, shadow.floating]}
          >
            <Animated.View style={fabIconStyle}>
              <Ionicons name="add" size={28} color={theme.accentText} />
            </Animated.View>
          </LinearGradient>
        </AnimatedPressable>

        {RIGHT.map(renderTab)}
      </View>
    </>
  );
}

function TabButton({
  meta,
  focused,
  accent,
  muted,
  onPress,
}: {
  meta: { icon: IoniconName; iconOutline: IoniconName; label: string };
  focused: boolean;
  accent: string;
  muted: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.85, motion.spring))}
      onPressOut={() => (scale.value = withSpring(focused ? 1.1 : 1, motion.spring))}
      style={styles.tab}
    >
      <Animated.View style={[iconStyle, { transform: [{ scale: focused ? 1.1 : 1 }] }]}>
        <Ionicons name={focused ? meta.icon : meta.iconOutline} size={22} color={focused ? accent : muted} />
      </Animated.View>
      <Text style={[focused ? typography.navActive : typography.nav, { color: focused ? accent : muted, marginTop: 2 }]}>
        {meta.label}
      </Text>
    </Pressable>
  );
}

function QuickAction({
  icon,
  label,
  index,
  onPress,
  accent,
  accentDark,
  accentText,
  large,
}: {
  icon: IoniconName;
  label: string;
  index: number;
  onPress: () => void;
  accent: string;
  accentDark: string;
  accentText: string;
  large?: boolean;
}) {
  const size = large ? 64 : 56;
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(14)} style={{ alignItems: 'center', gap: spacing[2] }}>
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={[accent, accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ width: size, height: size, borderRadius: radius['2xl'], alignItems: 'center', justifyContent: 'center' }, shadow.floating]}
        >
          <Ionicons name={icon} size={large ? 30 : 26} color={accentText} />
        </LinearGradient>
      </Pressable>
      <Text style={[typography.captionStrong, { color: '#fff' }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: spacing[2],
    paddingHorizontal: spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],
  },
  fabWrap: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  overlayBg: { ...StyleSheet.absoluteFillObject },
  actionsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[6] },
});
