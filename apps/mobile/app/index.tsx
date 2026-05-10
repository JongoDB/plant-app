import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { branding } from '@plant-app/shared';

import { healthApi } from '../src/api/client';
import { theme } from '../src/theme';

type ApiStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; time: string }
  | { kind: 'error'; message: string };

export default function HomeScreen() {
  const [status, setStatus] = useState<ApiStatus>({ kind: 'idle' });

  const check = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      const res = await healthApi.ping();
      setStatus({ kind: 'ok', time: res.time });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <>
      <Stack.Screen options={{ title: branding.APP_DISPLAY_NAME }} />
      <View style={styles.container}>
        <Text style={styles.heading}>{branding.APP_DISPLAY_NAME}</Text>
        <Text style={styles.tagline}>{branding.APP_TAGLINE}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>API status</Text>
          <Text style={styles.cardValue}>{describeStatus(status)}</Text>
          <Pressable style={styles.button} onPress={check}>
            <Text style={styles.buttonText}>Recheck</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Slice 0 — scaffolding only.</Text>
      </View>
    </>
  );
}

function describeStatus(s: ApiStatus): string {
  switch (s.kind) {
    case 'idle':
      return 'idle';
    case 'loading':
      return 'checking…';
    case 'ok':
      return `ok (${s.time})`;
    case 'error':
      return `error: ${s.message}`;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  heading: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tagline: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  cardLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '500',
  },
  button: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
