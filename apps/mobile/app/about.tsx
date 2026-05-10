import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { branding } from '@plant-app/shared';

import { RequireAuth } from '../src/components/RequireAuth';
import { theme } from '../src/theme';

export default function AboutScreen() {
  return (
    <RequireAuth>
      <Stack.Screen options={{ title: 'About & Privacy' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title={branding.APP_DISPLAY_NAME}>
          <Text style={styles.body}>{branding.APP_TAGLINE}</Text>
          <Text style={styles.muted}>
            Powered by {branding.ASSISTANT_NAME}, your local-first plant assistant.
          </Text>
        </Section>

        <Section title="Local-first AI">
          <Text style={styles.body}>
            This app is designed so the things that should stay on your phone — your
            voice, the camera frames you stream during a chat, your live location — do
            stay on your phone.
          </Text>
        </Section>

        <Section title="What stays on your device">
          <Bullet>
            Your voice while {branding.ASSISTANT_NAME} is listening. Speech is
            transcribed by your phone's built-in speech recognition; only the
            resulting text is sent to our servers.
          </Bullet>
          <Bullet>
            Spoken responses are produced by your phone's built-in text-to-speech.
          </Bullet>
          <Bullet>
            Your live location coordinates are used to fetch a brief weather
            summary; we don't store them on the server.
          </Bullet>
        </Section>

        <Section title="What goes to our backend">
          <Bullet>The text of your messages with {branding.ASSISTANT_NAME}.</Bullet>
          <Bullet>
            Photos you take or attach. Photos are stored on the host you control
            (your own infrastructure for now).
          </Bullet>
          <Bullet>Plants, care events, and reminders you create.</Bullet>
        </Section>

        <Section title="Third-party services">
          <Bullet>
            Anthropic (Claude) — receives the text of your conversation and any
            photos you've attached, to generate {branding.ASSISTANT_NAME}'s replies.
          </Bullet>
          <Bullet>
            Pl@ntNet — receives photos you submit for plant identification.
          </Bullet>
          <Bullet>
            Open-Meteo — receives the latitude/longitude you share for weather lookups.
          </Bullet>
        </Section>

        <Section title="Account & data">
          <Text style={styles.body}>
            Your account lives on the backend you've configured. Sign out via Settings
            ends your session on this device immediately. Deleting your data isn't
            wired into the app yet — for now, a database-side delete is the path.
          </Text>
        </Section>

        <Text style={styles.footer}>v0.1.0</Text>
      </ScrollView>
    </RequireAuth>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  body: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  muted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.xs,
  },
  bulletDot: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  footer: {
    marginTop: theme.spacing.lg,
    textAlign: 'center',
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
});
