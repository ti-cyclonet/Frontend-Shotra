import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../services/api';
import { playNotificationSound } from '../services/sound';
import { useAuth } from './AuthContext';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsContextValue {
  items: NotificationItem[];
  unread: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const POLL_INTERVAL = 12000; // 12s
const BANNER_DURATION = 5000; // 5s visible

const META_BY_TYPE: Record<string, { icon: any; color: string }> = {
  NEW_PROPOSAL: { icon: 'paper-plane', color: '#4ecdc4' },
  PROPOSAL_ACCEPTED: { icon: 'checkmark-circle', color: '#2ecc71' },
  PROPOSAL_REJECTED: { icon: 'close-circle', color: '#e74c3c' },
  CONTRACT_SIGNED: { icon: 'create', color: '#3498db' },
  CONTRACT_COMPLETED: { icon: 'checkmark-done', color: '#2ecc71' },
  NEW_RATING: { icon: 'star', color: '#f39c12' },
  NEW_MESSAGE: { icon: 'chatbubble-ellipses', color: '#9b59b6' },
};

const DEFAULT_META = { icon: 'notifications', color: '#4ecdc4' };

/** Banner animado y autocontenido para una novedad. */
function NotificationBanner({
  item,
  onPress,
  onDismiss,
}: {
  item: NotificationItem;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const useNative = Platform.OS !== 'web';
  const enter = useRef(new Animated.Value(0)).current; // 0 -> oculto, 1 -> visible
  const progress = useRef(new Animated.Value(0)).current; // 0 -> lleno, 1 -> vacio
  const meta = META_BY_TYPE[item.type] || DEFAULT_META;

  const dismiss = useCallback(() => {
    Animated.timing(enter, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: useNative,
    }).start(() => onDismiss());
  }, [enter, onDismiss, useNative]);

  useEffect(() => {
    // Entrada: slide + fade + scale
    Animated.spring(enter, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: useNative,
    }).start();

    // Barra de progreso de auto-cierre
    Animated.timing(progress, {
      toValue: 1,
      duration: BANNER_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const t = setTimeout(dismiss, BANNER_DURATION);
    return () => clearTimeout(t);
  }, [enter, progress, dismiss, useNative]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [-140, 0] });
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] });

  return (
    <Animated.View
      style={[
        styles.bannerWrap,
        { opacity: enter, transform: [{ translateY }, { scale }] },
      ]}
    >
      <View style={styles.bannerCard}>
        {/* Barra de acento lateral */}
        <View style={[styles.accent, { backgroundColor: meta.color }]} />

        <TouchableOpacity style={styles.bannerInner} activeOpacity={0.85} onPress={onPress}>
          <View style={[styles.iconWrap, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.bannerBody} numberOfLines={2}>{item.body}</Text>
          </View>
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#777" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Barra de progreso de cierre automatico */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: barWidth, backgroundColor: meta.color }]} />
        </View>
      </View>
    </Animated.View>
  );
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [banner, setBanner] = useState<NotificationItem | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res: any = await api.get('/notifications');
      const list: NotificationItem[] = res.items || [];
      setItems(list);
      setUnread(res.unread || 0);

      // Detectar nuevas (no vistas antes) para banner + sonido
      const fresh = list.filter((n) => !knownIds.current.has(n.id));
      list.forEach((n) => knownIds.current.add(n.id));

      if (!firstLoad.current) {
        const newUnread = fresh.filter((n) => !n.read);
        if (newUnread.length > 0) {
          playNotificationSound();
          setBanner(newUnread[0]);
        }
      }
      firstLoad.current = false;
    } catch {
      // silencioso
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  }, []);

  // Polling mientras hay sesion
  useEffect(() => {
    if (!isAuthenticated) {
      knownIds.current.clear();
      firstLoad.current = true;
      setItems([]);
      setUnread(0);
      setBanner(null);
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isAuthenticated, refresh]);

  const onBannerPress = () => {
    if (!banner) return;
    const b = banner;
    markRead(b.id);
    setBanner(null);
    if (b.entityType === 'contract' && b.entityId) router.push(`/contract/${b.entityId}`);
    else if (b.entityType === 'request' && b.entityId) router.push(`/request/${b.entityId}`);
  };

  return (
    <NotificationsContext.Provider value={{ items, unread, refresh, markRead, markAllRead }}>
      {children}
      {banner && (
        <NotificationBanner
          key={banner.id}
          item={banner}
          onPress={onBannerPress}
          onDismiss={() => setBanner(null)}
        />
      )}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 44,
    paddingHorizontal: 12,
    zIndex: 1000,
    alignItems: 'center',
  },
  bannerCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  accent: { width: 5 },
  bannerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  bannerTitle: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  bannerBody: { color: '#aaa', fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  closeBtn: { padding: 2 },
  progressTrack: {
    position: 'absolute',
    left: 5, right: 0, bottom: 0,
    height: 3,
    backgroundColor: 'transparent',
  },
  progressFill: { height: 3, borderBottomLeftRadius: 2 },
});
