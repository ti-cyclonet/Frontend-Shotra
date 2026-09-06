import { ReactNode } from 'react';
import { View, ScrollView, ViewStyle, ScrollViewProps } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../context/ThemeProvider';

export interface ScreenProps {
  children: ReactNode;
  /** Envuelve el contenido en un ScrollView (por defecto true). */
  scroll?: boolean;
  /** Padding horizontal (por defecto 20). */
  padding?: number;
  /** Bordes seguros a aplicar. Por defecto top+bottom. */
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
  style?: ViewStyle;
}

/**
 * Contenedor base de pantalla: fondo del tema + safe-area + padding y espacio
 * inferior generoso (para no chocar con la barra flotante estilo Kiri).
 */
export function Screen({
  children,
  scroll = true,
  padding = spacing[5],
  edges = ['top'],
  contentContainerStyle,
  scrollProps,
  style,
}: ScreenProps) {
  const { theme } = useTheme();

  const inner = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...scrollProps}
      contentContainerStyle={[
        { paddingHorizontal: padding, paddingBottom: spacing[16] + spacing[8] },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: padding }, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: theme.background }, style]}>
      {inner}
    </SafeAreaView>
  );
}
