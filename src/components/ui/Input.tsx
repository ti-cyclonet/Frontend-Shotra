import { forwardRef } from 'react';
import { TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../context/ThemeProvider';

export interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

/**
 * Campo de texto estilo Kiri: muy redondeado, superficie tintada del tema,
 * tipografia Poppins. Soporta multiline (textArea) via numberOfLines/multiline.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { style, containerStyle, multiline, ...props },
  ref,
) {
  const { theme, themeKey } = useTheme();
  const isLight = themeKey === 'graphite';

  return (
    <View
      style={[
        {
          backgroundColor: isLight ? theme.inputBg : theme.glass,
          borderWidth: 1,
          borderColor: theme.glassBorder,
          borderRadius: radius.lg,
          paddingHorizontal: spacing[4],
        },
        containerStyle,
      ]}
    >
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={theme.inputPlaceholder}
        {...props}
        style={[
          typography.body,
          {
            color: theme.inputText,
            paddingVertical: spacing[3],
            ...(multiline ? { minHeight: 100, textAlignVertical: 'top' as const } : {}),
          },
          style,
        ]}
      />
    </View>
  );
});
