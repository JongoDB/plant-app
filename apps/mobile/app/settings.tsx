import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';

import { authClient } from '../src/auth/client';
import { Button } from '../src/components/Button';
import { RequireAuth } from '../src/components/RequireAuth';
import { Screen } from '../src/components/Screen';
import { theme } from '../src/theme';

export default function SettingsScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SettingsContent />
    </RequireAuth>
  );
}

function SettingsContent() {
  const { data: session } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.replace('/sign-in');
    } finally {
      setSigningOut(false);
    }
  };

  if (!session) return null;

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Signed in as</Text>
        <Text style={styles.name}>{session.user.name}</Text>
        <Text style={styles.email}>{session.user.email}</Text>
      </View>

      <Button
        title="All reminders"
        variant="secondary"
        onPress={() => router.push('/reminders')}
      />
      <Button title="Sign out" onPress={signOut} variant="ghost" loading={signingOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  cardLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '600',
  },
  email: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
});
