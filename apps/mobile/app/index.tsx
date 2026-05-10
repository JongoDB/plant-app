import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { branding } from '@plant-app/shared';

import { authClient } from '../src/auth/client';
import { healthApi } from '../src/api/client';
import { RequireAuth } from '../src/components/RequireAuth';
import { Screen } from '../src/components/Screen';
import { theme } from '../src/theme';

type ApiStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; time: string }
  | { kind: 'error'; message: string };

export default function HomeScreen() {
  return (
    <RequireAuth>
      <Stack.Screen
        options={{
          title: branding.APP_DISPLAY_NAME,
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable style={styles.headerButton} hitSlop={8}>
                <Text style={styles.headerButtonText}>Settings</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <HomeContent />
    </RequireAuth>
  );
}

function HomeContent() {
  const { data: session } = authClient.useSession();
  const firstName = session?.user.name?.split(' ')[0] ?? 'friend';

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
    <Screen>
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hi {firstName} 🌱</Text>
        <Text style={styles.hint}>
          Your plants list will land here in the next slice. For now, just a
          chance to make sure the app talks to the API.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>API status</Text>
        <Text style={styles.cardValue}>{describeStatus(status)}</Text>
        <Pressable style={styles.recheck} onPress={check} hitSlop={6}>
          <Text style={styles.recheckText}>Recheck</Text>
        </Pressable>
      </View>
    </Screen>
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
  headerButton: {
    paddingHorizontal: theme.spacing.sm,
  },
  headerButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  greeting: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  hello: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  hint: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
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
  recheck: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  recheckText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
