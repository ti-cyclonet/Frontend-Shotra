import { ReactNode } from 'react';
import { View, ViewProps, ViewStyle, Platform } from 'react-native';
import { radius, spacing, shadow } from '../../theme/tokens';
import { useTheme } from '../../context/ThemeProvider';

export interface CardProps extends ViewProps {
  children: ReactNode;
  /** Variante mas marcada (secciones destacadas). */
  strong?: boolean;
  /** Padding interno (por defecto 20). Usa false para 0. */
  padding?: number | false;
  /** Radio de las esquinas (por defecto 2xl = 24). */
  rounded?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Tarjeta estilo Kiri: superficie tintada suave, muy redondeada, borde sutil
 * y sombra ligera. Es el contenedor base de casi todo el UI.
 */
export function Card({ children, strong, padding = 20, rounded = radius['2xl'], style, ...props }: CardProps) {
  const { theme, themeKey } = useTheme();
  const isLight = themeKey === 'graphite';

  const glassBlur =
    Platform.OS === 'web' && !isLight
      ? ({ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } as any)
      : {};

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: strong ? theme.glassStrong : theme.glass,
          borderWidth: 1,
          borderColor: theme.glassBorder,
          borderRadius: rounded,
          padding: padding === false ? 0 : padding,
          ...(isLight ? {} : { borderTopColor: theme.glassHighlight }),
        },
        isLight ? shadow.card : glassBlur,
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

/** Encabezado de tarjeta con separacion estandar. */
export function CardHeader({ children, style, ...props }: ViewProps & { children: ReactNode }) {
  return (
    <View {...props} style={[{ marginBottom: spacing[4], gap: spacing[1] }, style]}>
      {children}
    </View>
  );
}
