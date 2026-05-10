import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Optional small text under the button (e.g. "Coming soon"). */
  subtitle?: string;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  subtitle,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.surface : theme.colors.primary} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], inactive && styles.disabledText]}>
          {title}
        </Text>
      )}
      {subtitle ? (
        <Text style={[styles.subtitle, inactive && styles.disabledSubtitle]}>{subtitle}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  primaryText: {
    color: theme.colors.surface,
  },
  secondaryText: {
    color: theme.colors.text,
  },
  ghostText: {
    color: theme.colors.primary,
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
  subtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: '400',
  },
  disabledSubtitle: {
    color: theme.colors.textMuted,
  },
});
