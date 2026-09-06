import { View, ViewStyle } from 'react-native';
import { radius, spacing, typography } from '../../theme/tokens';
import { chipColors, ChipColor } from '../../theme/tokens';
import { Text } from './Text';
import { useTheme } from '../../context/ThemeProvider';

export interface BadgeProps {
  label: string;
  /** Tinte del badge. Por defecto usa el acento del tema. */
  color?: ChipColor;
  /** Badge solido (relleno con el acento) en vez de tinte suave. */
  solid?: boolean;
  style?: ViewStyle;
}

/** Badge/pill estilo Kiri: rounded-full, texto xs semibold, tinte suave. */
export function Badge({ label, color, solid, style }: BadgeProps) {
  const { theme } = useTheme();

  let bg: string;
  let fg: string;
  if (solid) {
    bg = theme.accent;
    fg = theme.accentText;
  } else if (color) {
    bg = chipColors[color].bg;
    fg = chipColors[color].fg;
  } else {
    bg = theme.accentSoft;
    fg = theme.accent;
  }

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing[3],
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text style={[typography.captionStrong, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Punto de notificacion pequeno (contador). */
export function CountDot({ count }: { count?: number }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        minWidth: 18,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: radius.pill,
        backgroundColor: theme.danger,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[typography.micro, { color: '#fff', fontSize: 10, lineHeight: 14 }]}>
        {count != null && count > 9 ? '9+' : count ?? ''}
      </Text>
    </View>
  );
}
