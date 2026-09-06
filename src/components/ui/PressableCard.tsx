import { ReactNode } from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radius, shadow, motion } from '../../theme/tokens';
import { useTheme } from '../../context/ThemeProvider';

export interface PressableCardProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  strong?: boolean;
  padding?: number | false;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Tarjeta presionable con micro-escala springy (para filas/items tocables).
 * Mismo look que Card pero reacciona al toque como los items de Kiri.
 */
export function PressableCard({
  children,
  strong,
  padding = 16,
  rounded = radius.xl,
  style,
  ...props
}: PressableCardProps) {
  const { theme, themeKey } = useTheme();
  const isLight = themeKey === 'graphite';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const glassBlur =
    Platform.OS === 'web' && !isLight
      ? ({ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } as any)
      : {};

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, motion.spring);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.spring);
        props.onPressOut?.(e);
      }}
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
        animatedStyle,
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
