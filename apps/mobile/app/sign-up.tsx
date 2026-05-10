import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { branding } from '@plant-app/shared';

import { authClient } from '../src/auth/client';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { TextField } from '../src/components/TextField';
import { theme } from '../src/theme';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!name || !email || !password) {
      setError('Name, email, and password are all required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await authClient.signUp.email({ name, email, password });
      if (res.error) {
        setError(res.error.message ?? 'Could not create account.');
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
          <Text style={styles.subtitle}>Create your account.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Sam"
            autoCapitalize="words"
            textContentType="name"
          />
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
            placeholder="At least 8 characters"
            secureTextEntry
            textContentType="newPassword"
            error={error}
          />
          <Button title="Create account" onPress={submit} loading={submitting} />
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
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/sign-in" replace asChild>
            <Pressable>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.privacyRow}>
          <Text style={styles.privacyText}>
            By signing up you agree that your voice and live camera frames stay on your
            phone, while photos and chat text are sent to your backend and the services
            it talks to.{' '}
          </Text>
          <Link href="/about" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Learn more</Text>
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
  privacyRow: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  privacyText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  footerLink: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
