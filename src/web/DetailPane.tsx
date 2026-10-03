import { ComponentType, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeProvider';
import { Text } from '../components/ui/Text';
import { spacing, radius } from '../theme/tokens';
import { EmbedProvider, useActiveDetail, closeDetail } from './nav';

import ChatScreen from '../../app/chat/[requestId]';
import RequestScreen from '../../app/request/[id]';
import ContractScreen from '../../app/contract/[id]';
import ProviderScreen from '../../app/provider/[id]';
import NotificationsScreen from '../../app/notifications';
import AccountStatementScreen from '../../app/account-statement';
import EditProfileScreen from '../../app/edit-profile';
import PortfolioSettingsScreen from '../../app/portfolio-settings';

/** Qué pantalla mostrar en el panel para cada ruta, y cómo sacar sus parámetros. */
const ROUTES: { re: RegExp; param?: string; Screen: ComponentType; fullWidth?: boolean }[] = [
  // El chat ocupa todo el panel; el resto se centra con un ancho cómodo de lectura
  { re: /^\/chat\/([^/]+)$/, param: 'requestId', Screen: ChatScreen, fullWidth: true },
  { re: /^\/request\/([^/]+)$/, param: 'id', Screen: RequestScreen },
  { re: /^\/contract\/([^/]+)$/, param: 'id', Screen: ContractScreen },
  { re: /^\/provider\/([^/]+)$/, param: 'id', Screen: ProviderScreen },
  { re: /^\/notifications$/, Screen: NotificationsScreen },
  { re: /^\/account-statement$/, Screen: AccountStatementScreen },
  { re: /^\/edit-profile$/, Screen: EditProfileScreen },
  { re: /^\/portfolio-settings$/, Screen: PortfolioSettingsScreen },
];

/** Panel derecho de la web ancha: el detalle abierto o la portada de Shotra. */
export function DetailPane() {
  const { theme } = useTheme();
  const path = useActiveDetail();

  // Esc cierra el panel, como en WhatsApp Web
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  for (const r of path ? ROUTES : []) {
    const m = path!.match(r.re);
    if (!m) continue;
    const params = r.param ? { [r.param]: decodeURIComponent(m[1]) } : {};
    return (
      <View style={[styles.pane, { backgroundColor: theme.background }]}>
        {/* key: al cambiar de ruta la pantalla se monta de nuevo con su estado limpio */}
        <EmbedProvider key={path} params={params}>
          <View style={r.fullWidth ? styles.pane : styles.reading}>
            <r.Screen />
          </View>
        </EmbedProvider>
      </View>
    );
  }

  return <Welcome />;
}

/** Portada del panel cuando no hay nada abierto (como la de WhatsApp Web). */
function Welcome() {
  const { theme } = useTheme();
  const tips: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: 'search-outline', text: 'Explora servicios cerca de ti y ábrelos aquí sin perder la lista.' },
    { icon: 'chatbubbles-outline', text: 'Conversa con tus clientes y ofertantes mientras revisas tus solicitudes.' },
    { icon: 'add-circle-outline', text: 'Publica una solicitud nueva con el botón + de la barra lateral.' },
  ];
  return (
    <View style={[styles.pane, styles.welcome, { backgroundColor: theme.background }]}>
      <Image source={require('../../assets/logo_rojo.png')} style={styles.logo} resizeMode="contain" />
      <Text variant="h1" style={{ marginTop: spacing[6], textAlign: 'center' }}>Shotra para web</Text>
      <Text variant="body" muted style={styles.lead}>
        Elige un servicio, una solicitud o un chat de la lista para verlo en este espacio.
      </Text>
      <View style={styles.tips}>
        {tips.map((t) => (
          <View key={t.icon} style={[styles.tip, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <View style={[styles.tipIcon, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name={t.icon} size={18} color={theme.accent} />
            </View>
            <Text variant="caption" style={{ flex: 1 }}>{t.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: { flex: 1 },
  reading: { flex: 1, width: '100%', maxWidth: 880, alignSelf: 'center' },
  welcome: { alignItems: 'center', justifyContent: 'center', padding: spacing[8] },
  logo: { width: 260, height: 93 },
  lead: { marginTop: spacing[2], textAlign: 'center', maxWidth: 420 },
  tips: { marginTop: spacing[8], gap: spacing[3], width: '100%', maxWidth: 460 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  tipIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
