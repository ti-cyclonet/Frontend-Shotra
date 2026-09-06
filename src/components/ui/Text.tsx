import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { typography, TypographyKey } from '../../theme/tokens';
import { useTheme } from '../../context/ThemeProvider';

export interface TextProps extends RNTextProps {
  /** Variante de la escala tipografica. Por defecto "body". */
  variant?: TypographyKey;
  /** Usa el color de texto secundario del tema. */
  muted?: boolean;
  /** Color explicito (sobrescribe muted y el color del tema). */
  color?: string;
}

/**
 * Texto tipado a la escala tipografica de Shotra (Poppins).
 * Usa siempre este componente en vez de <Text> nativo para heredar la fuente.
 */
export function Text({ variant = 'body', muted, color, style, ...props }: TextProps) {
  const { theme } = useTheme();
  const resolved = color ?? (muted ? theme.textMuted : theme.text);
  return <RNText {...props} style={[typography[variant], { color: resolved }, style]} />;
}
