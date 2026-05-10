import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { branding } from '@plant-app/shared';

import { authClient } from '../src/auth/client';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { TextField } from '../src/components/TextField';
import { theme } from '../src/theme';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? 'Could not sign in.');
        return;
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.brand}>{branding.APP_DISPLAY_NAME}</Text>
          <Text style={styles.subtitle}>Welcome back.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            textContentType="password"
            error={error}
          />
          <Button title="Sign in" onPress={submit} loading={submitting} />
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerLabel}>Or continue with</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.providers}>
          <Button title="Continue with Google" subtitle="Coming soon" variant="secondary" disabled />
          <Button title="Continue with Apple" subtitle="Coming soon" variant="secondary" disabled />
          <Button title="Continue with Microsoft" subtitle="Coming soon" variant="secondary" disabled />
          <Button title="Continue with Facebook" subtitle="Coming soon" variant="secondary" disabled />
          <Button title="Email me a magic link" subtitle="Coming soon" variant="secondary" disabled />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/sign-up" replace asChild>
            <Pressable>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  brand: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  form: {
    gap: theme.spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  providers: {
    gap: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  footerLink: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
