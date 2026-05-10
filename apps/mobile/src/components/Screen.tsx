import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme';

interface ScreenProps {
  children: ReactNode;
  /** Use a ScrollView instead of a View; defaults to false. */
  scroll?: boolean;
  /** Extra style merged onto the inner content container. */
  style?: ViewStyle;
}

/**
 * Standard screen wrapper: respects safe-area insets, themed background,
 * default padding. Use `scroll` for screens that may overflow (e.g. forms
 * with the keyboard up).
 */
export function Screen({ children, scroll = false, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + theme.spacing.lg,
    paddingBottom: insets.bottom + theme.spacing.lg,
  };
  if (scroll) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, padding, style]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.container, styles.content, padding, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
});
