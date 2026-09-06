import { View } from 'react-native';
import { spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface SectionLabelProps {
  children: string;
  /** Margen superior (para separar de la seccion anterior). */
  topGap?: number;
}

/**
 * Etiqueta de seccion estilo Kiri: 10px, bold, mayusculas, tracking amplio,
 * color atenuado. Encabeza grupos de tarjetas/listas.
 */
export function SectionLabel({ children, topGap = spacing[6] }: SectionLabelProps) {
  return (
    <View style={{ marginTop: topGap, marginBottom: spacing[2], paddingHorizontal: spacing[1] }}>
      <Text variant="sectionLabel" muted>
        {children}
      </Text>
    </View>
  );
}
