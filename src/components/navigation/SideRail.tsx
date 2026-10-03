import { View, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeProvider';
import { useChat } from '../../context/ChatContext';
import { useNotifications } from '../../context/NotificationsContext';
import { openRoute, useActiveDetail } from '../../web/nav';
import { radius, spacing, shadow, typography } from '../../theme/tokens';
import { Text } from '../ui/Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Ancho de la barra lateral de íconos (web ancha). */
export const RAIL_WIDTH = 76;

// Mismos íconos y nombres que la barra inferior del celular (GlassTabBar)
const TABS: { name: string; icon: IoniconName; iconOutline: IoniconName; label: string }[] = [
  { name: 'feed', icon: 'search', iconOutline: 'search-outline', label: 'Explorar' },
  { name: 'my-requests', icon: 'list', iconOutline: 'list-outline', label: 'Solicitudes' },
  { name: 'messages', icon: 'chatbubbles', iconOutline: 'chatbubbles-outline', label: 'Chat' },
];

/**
 * Barra lateral de la versión web ancha, al estilo de WhatsApp Web: las
 * pestañas arriba, el botón Publicar con el gradiente del FAB, y abajo las
 * notificaciones (se abren en el panel de detalle) y el perfil.
 */
export function SideRail({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const { totalUnread } = useChat();
  const { unread } = useNotifications();
  const activeDetail = useActiveDetail();
  const current = state.routes[state.index]?.name;

  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (current !== name && !event.defaultPrevented) navigation.navigate(name);
  };

  return (
    <View style={[styles.rail, { backgroundColor: theme.tabBar, borderRightColor: theme.border }]}>
      <View style={styles.group}>
        {TABS.map((t) => (
          <RailButton
            key={t.name}
            icon={current === t.name ? t.icon : t.iconOutline}
            label={t.label}
            active={current === t.name}
            badge={t.name === 'messages' ? totalUnread : 0}
            onPress={() => go(t.name)}
          />
        ))}

        <Pressable onPress={() => go('create')} style={styles.publish} accessibilityLabel="Publicar">
          {({ hovered }: any) => (
            <>
              <LinearGradient
                colors={[theme.accent, theme.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.fab, shadow.floating, { transform: [{ scale: hovered || current === 'create' ? 1.06 : 1 }] }]}
              >
                <Ionicons name="add" size={26} color={theme.accentText} />
              </LinearGradient>
              <Text style={[current === 'create' ? typography.navActive : typography.nav, { color: current === 'create' ? theme.accent : theme.textMuted, marginTop: 4 }]}>
                Publicar
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.group}>
        <RailButton
          icon={activeDetail === '/notifications' ? 'notifications' : 'notifications-outline'}
          label="Avisos"
          active={activeDetail === '/notifications'}
          badge={unread}
          onPress={() => openRoute('/notifications')}
        />
        <RailButton
          icon={current === 'profile' ? 'person' : 'person-outline'}
          label="Perfil"
          active={current === 'profile'}
          onPress={() => go('profile')}
        />
      </View>
    </View>
  );
}

function RailButton({
  icon,
  label,
  active,
  badge = 0,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityLabel={label}>
      {({ hovered }: any) => (
        <>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: active ? theme.accentSoft : hovered ? theme.glassStrong : 'transparent' },
            ]}
          >
            <Ionicons name={icon} size={22} color={active ? theme.accent : theme.textMuted} />
            {badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            )}
          </View>
          <Text style={[active ? typography.navActive : typography.nav, { color: active ? theme.accent : theme.textMuted, marginTop: 2 }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: RAIL_WIDTH,
    borderRightWidth: 1,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  group: { alignItems: 'center', gap: spacing[3] },
  item: { alignItems: 'center', width: RAIL_WIDTH },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publish: { alignItems: 'center', marginTop: spacing[2] },
  fab: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 12 },
});
