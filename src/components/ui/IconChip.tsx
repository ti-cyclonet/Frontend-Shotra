import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, chipColors, ChipColor } from '../../theme/tokens';
import { useTheme } from '../../context/ThemeProvider';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface IconChipProps {
  icon: IoniconName;
  /** Color semantico del tinte (rojo por defecto = marca Shotra). */
  color?: ChipColor;
  /** Tamano del cuadrito (por defecto 40). */
  size?: number;
  /** Tamano del icono (por defecto ~55% del chip). */
  iconSize?: number;
  /** Color de fondo explicito (sobrescribe color). */
  bg?: string;
  /** Color del icono explicito (sobrescribe color). */
  fg?: string;
  rounded?: number;
  style?: ViewStyle;
}

/**
 * Chip de icono estilo Kiri: cuadrito redondeado con fondo tintado que
 * contiene un icono del mismo color. Patron recurrente en listas, cabeceras
 * de seccion, notificaciones y filas.
 */
export function IconChip({
  icon,
  color = 'red',
  size = 40,
  iconSize,
  bg,
  fg,
  rounded = radius.md,
  style,
}: IconChipProps) {
  const { themeKey } = useTheme();

  // En el tema Carmesi las tarjetas son paneles oscuros; el tinte rojo de marca
  // no contrasta. Para el color por defecto ('red') se usa un chip claro
  // (icono blanco sobre tinte claro translucido) que resalta sobre el panel
  // oscuro. Los demas colores semanticos (green/blue/etc.) se dejan igual.
  const crimsonRedChip = { bg: 'rgba(255,255,255,0.14)', fg: '#ffe0e0' };
  const palette =
    themeKey === 'crimson' && color === 'red' ? crimsonRedChip : chipColors[color];

  const background = bg ?? palette.bg;
  const foreground = fg ?? palette.fg;
  const glyph = iconSize ?? Math.round(size * 0.55);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: rounded,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={glyph} color={foreground} />
    </View>
  );
}
