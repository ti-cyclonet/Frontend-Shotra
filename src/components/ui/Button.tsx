import { ReactNode } from 'react';
import { Pressable, PressableProps, ViewStyle, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, motion } from '../../theme/tokens';
import { Text } from './Text';
import { useTheme } from '../../context/ThemeProvider';

type IoniconName = keyof typeof Ionicons.glyphMap;
type Variant = 'primary' | 'gradient' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: IoniconName;
  iconRight?: IoniconName;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const heights: Record<Size, number> = { sm: 40, md: 48, lg: 56 };
const padX: Record<Size, number> = { sm: spacing[4], md: spacing[5], lg: spacing[6] };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Boton estilo Kiri: muy redondeado (rounded-xl), texto bold, y micro-escala
 * springy al presionar (active:scale-90). La variante "gradient" usa el
 * gradiente de marca (acento -> acento oscuro).
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  fullWidth,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = () => {
    scale.value = withSpring(motion.pressScale, motion.spring);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, motion.spring);
  };

  const isDisabled = disabled || loading;

  // Colores segun variante
  let bg: string | undefined;
  let borderColor: string | undefined;
  let fg: string;
  switch (variant) {
    case 'outline':
      bg = 'transparent';
      borderColor = theme.glassBorder;
      fg = theme.text;
      break;
    case 'ghost':
      bg = 'transparent';
      fg = theme.accent;
      break;
    case 'gradient':
      fg = theme.accentText;
      break;
    case 'primary':
    default:
      bg = theme.accent;
      fg = theme.accentText;
  }

  const baseStyle: ViewStyle = {
    height: heights[size],
    paddingHorizontal: padX[size],
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    opacity: isDisabled ? 0.5 : 1,
    ...(fullWidth ? { alignSelf: 'stretch' } : {}),
    ...(borderColor ? { borderWidth: 1.5, borderColor } : {}),
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[typography.button, { color: fg }]}>{label}</Text>
          {iconRight && <Ionicons name={iconRight} size={18} color={fg} />}
        </>
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <AnimatedPressable
        {...props}
        disabled={isDisabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[animatedStyle, fullWidth ? { alignSelf: 'stretch' } : undefined, style]}
      >
        <LinearGradient
          colors={[theme.accent, theme.accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={baseStyle}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      {...props}
      disabled={isDisabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[baseStyle, { backgroundColor: bg }, animatedStyle, style]}
    >
      {content}
    </AnimatedPressable>
  );
}
