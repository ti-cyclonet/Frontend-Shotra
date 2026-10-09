import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from '../services/api';
import { playNotificationSound, playChatMessageSound } from '../services/sound';
import { useAuth } from './AuthContext';
import { openRoute } from '../web/nav';
import { setTitleBadge, showBrowserNotification } from '../web/browserNotify';

const IS_WEB = Platform.OS === 'web';

/** Destino de una notificación (chat, contrato o solicitud). */
function openEntity(n: { entityType?: string; entityId?: string }): void {
  if (n.entityType === 'chat' && n.entityId) openRoute(`/chat/${n.entityId}`);
  else if (n.entityType === 'contract' && n.entityId) openRoute(`/contract/${n.entityId}`);
  else if (n.entityType === 'request' && n.entityId) openRoute(`/request/${n.entityId}`);
}

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
  clearAll: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const POLL_INTERVAL = 12000; // 12s
const BANNER_DURATION = 5000; // 5s visible

// En Android, setBadgeCountAsync por sí solo NO alcanza: la mayoría de
// launchers (Samsung One UI, Pixel, etc.) calculan el badge del ícono a
// partir de las notificaciones REALES activas en la bandeja del sistema, no
// de un número arbitrario. Por eso, además de nuestro banner/sonido propios
// dentro de la app, hay que publicar una notificación local real cuando llega
// algo nuevo — así el badge (y la bandeja al deslizar desde arriba) reflejan
// lo mismo que ve el usuario abriendo la app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // El banner/sonido ya los maneja la UI propia (NotificationBanner + los
    // de sound.ts); acá solo se necesita que la notificación quede
    // registrada en el sistema (bandeja) para que el badge del ícono se
    // actualice. shouldShowAlert:false evita el pop-up nativo duplicado.
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
    showBadge: true,
  }).catch(() => {});
}

const META_BY_TYPE: Record<string, { icon: any; color: string }> = {
  NEW_PROPOSAL: { icon: 'paper-plane', color: '#4ecdc4' },
  PROPOSAL_ACCEPTED: { icon: 'checkmark-circle', color: '#2ecc71' },
  PROPOSAL_REJECTED: { icon: 'close-circle', color: '#e74c3c' },
  CONTRACT_SIGNED: { icon: 'create', color: '#3498db' },
  CONTRACT_COMPLETED: { icon: 'checkmark-done', color: '#2ecc71' },
  NEW_RATING: { icon: 'star', color: '#f39c12' },
  RATING_REVEALED: { icon: 'star-half', color: '#f39c12' },
  NEW_MESSAGE: { icon: 'chatbubble-ellipses', color: '#9b59b6' },
  REQUEST_EXPIRED: { icon: 'time', color: '#95a5a6' },
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

      // Detectar nuevas (no vistas antes de esta sesión de JS)
      const fresh = list.filter((n) => !knownIds.current.has(n.id));
      list.forEach((n) => knownIds.current.add(n.id));
      const freshUnread = fresh.filter((n) => !n.read);

      if (freshUnread.length > 0) {
        // Publicar/actualizar una notificación local real por cada una — ESTO
        // corre SIEMPRE, incluida la primera carga (reabrir la app después de
        // minimizarla cuenta como "primera carga" de este componente). Sin
        // esto, el badge del ícono nunca aparecía al reabrir: el launcher lo
        // calcula de las notificaciones activas en la bandeja, no de un
        // número arbitrario. `identifier: n.id` hace que reposteos del mismo
        // id (ej. sigue sin leerse en la próxima apertura) reemplacen la
        // entrada en vez de duplicarla.
        // Las que llegaron por push (app minimizada o cerrada) ya están en la
        // bandeja: no se publican otra vez al volver a la app.
        // En la web no hay bandeja del sistema (ver el aviso del navegador abajo).
        const presented = IS_WEB ? [] : await Notifications.getPresentedNotificationsAsync().catch(() => []);
        const inTray = new Set(presented.map((p) => (p.request.content.data as any)?.notificationId).filter(Boolean));
        for (const n of IS_WEB ? [] : freshUnread) {
          if (inTray.has(n.id)) continue;
          Notifications.scheduleNotificationAsync({
            identifier: n.id,
            content: {
              title: n.title,
              body: n.body,
              badge: res.unread || 0,
              data: { notificationId: n.id, entityType: n.entityType, entityId: n.entityId },
            },
            trigger: null,
          }).catch(() => {});
        }

        // Banner + sonido propios: SOLO para novedades reales durante la
        // sesión, no en la primera carga (evita el "spam" de todo lo
        // pendiente apenas se abre la app).
        if (!firstLoad.current) {
          const next = freshUnread[0];
          if (next.type === 'NEW_MESSAGE') {
            playChatMessageSound();
          } else {
            playNotificationSound();
          }
          setBanner(next);
          // Web: si la pestaña no está a la vista, aviso del navegador (con permiso)
          if (IS_WEB) showBrowserNotification(next, () => { markReadRef.current(next.id); openEntity(next); });
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
  // refresh se define antes que markRead: el aviso del navegador lo usa por referencia
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
      // Limpiar la bandeja del sistema: si no, quedan notificaciones "viejas"
      // activas y el badge del ícono no baja a 0 aunque aquí ya diga 0.
      Notifications.dismissAllNotificationsAsync().catch(() => {});
    } catch {}
  }, []);

  /** Vacía (borra) todas las notificaciones — no solo marcarlas leídas. */
  const clearAll = useCallback(async () => {
    try {
      await api.delete('/notifications');
      setItems([]);
      setUnread(0);
      knownIds.current.clear();
      Notifications.dismissAllNotificationsAsync().catch(() => {});
    } catch {}
  }, []);

  // Pedir permiso de notificaciones y registrar el push token del
  // dispositivo (necesario en Android 13+ e iOS para el badge y para poder
  // recibir notificaciones reales aunque la app esté minimizada o cerrada).
  // Best-effort: si el usuario niega el permiso, simplemente no llegan push
  // ni badge; el resto de la app sigue funcionando igual (banner in-app +
  // sonido siguen dependiendo del polling mientras la app esté abierta).
  useEffect(() => {
    // En la web el permiso se pide con un clic (Avisos → Activar): pedirlo solo
    // al entrar hace que el navegador lo bloquee o lo silencie. Tampoco hay push.
    if (!isAuthenticated || IS_WEB) return;
    (async () => {
      try {
        // El permiso se pide igual: lo necesitan el badge y las notificaciones
        // locales que se publican mientras la app está abierta.
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        // Push remoto activo por defecto (llega con la app minimizada o
        // cerrada); EXPO_PUBLIC_REMOTE_PUSH=false lo desactiva en un build.
        if (process.env.EXPO_PUBLIC_REMOTE_PUSH === 'false') return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        await api.post('/push-tokens', { token, platform: Platform.OS }).catch(() => {});
      } catch {
        // Sin push token (emulador sin Google Play Services, permiso
        // denegado, etc.): la app sigue funcionando con polling in-app.
      }
    })();
  }, [isAuthenticated]);

  // Notificación push recibida mientras la app está abierta: refrescar ya
  // (no esperar al próximo tick del polling) para que el badge/banner
  // in-app queden al día de inmediato.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Tocar la notificación (bandeja del sistema o banner nativo) navega al
  // mismo destino que el banner propio de la app.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openEntity(response.notification.request.content.data as { entityType?: string; entityId?: string });
    });
    return () => sub.remove();
  }, []);

  // Badge numérico en el ícono de la app (pantalla de inicio), reflejando el
  // total de notificaciones pendientes (incluye mensajes de chat, ya que
  // NEW_MESSAGE es un tipo más dentro de este mismo conteo). No depende de
  // tener una notificación real en la bandeja: setBadgeCountAsync lo fija
  // directamente sobre el ícono en los launchers que lo soportan.
  useEffect(() => {
    // Web: el contador va en el título de la pestaña ("(3) Shotra")
    if (IS_WEB) setTitleBadge(unread);
    else Notifications.setBadgeCountAsync(unread).catch(() => {});
  }, [unread]);

  // Polling mientras hay sesion
  useEffect(() => {
    if (!isAuthenticated) {
      knownIds.current.clear();
      firstLoad.current = true;
      setItems([]);
      setUnread(0);
      setBanner(null);
      // Sin sesión no debe quedar nada del usuario anterior en la bandeja ni en el badge
      Notifications.dismissAllNotificationsAsync().catch(() => {});
      Notifications.setBadgeCountAsync(0).catch(() => {});
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
    openEntity(b);
  };

  return (
    <NotificationsContext.Provider value={{ items, unread, refresh, markRead, markAllRead, clearAll }}>
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
