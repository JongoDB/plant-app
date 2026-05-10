import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Reminder, ReminderKind } from '@plant-app/shared';

import { remindersApi } from '../api/reminders';
import { theme } from '../theme';

const KIND_EMOJI: Record<ReminderKind, string> = {
  water: '💧',
  fertilize: '🌿',
  prune: '✂️',
  repot: '🪴',
  rotate: '↻',
};

const KIND_LABEL: Record<ReminderKind, string> = {
  water: 'Water',
  fertilize: 'Fertilize',
  prune: 'Prune',
  repot: 'Repot',
  rotate: 'Rotate',
};

interface Props {
  reminder: Reminder;
  /** Optional plant name to show alongside the reminder kind. */
  plantName?: string;
  onCompleted?: () => void;
}

export function ReminderRow({ reminder, plantName, onCompleted }: Props) {
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const complete = async () => {
    setCompleting(true);
    setError(undefined);
    try {
      await remindersApi.complete(reminder.id);
      onCompleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCompleting(false);
    }
  };

  const due = new Date(reminder.nextDueAt);
  const relative = relativeDay(due);
  const overdue = due.getTime() < Date.now();

  return (
    <View style={[styles.row, overdue && reminder.active && styles.rowOverdue]}>
      <Text style={styles.emoji}>{KIND_EMOJI[reminder.kind]}</Text>
      <View style={styles.body}>
        <View style={styles.firstLine}>
          <Text style={styles.kind}>{KIND_LABEL[reminder.kind]}</Text>
          {plantName ? <Text style={styles.plant}> · {plantName}</Text> : null}
        </View>
        <Text style={[styles.when, overdue && reminder.active ? styles.whenOverdue : null]}>
          {relative}
          {reminder.intervalDays ? ` · every ${reminder.intervalDays} days` : ''}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      {reminder.active ? (
        <Pressable
          onPress={complete}
          disabled={completing}
          style={({ pressed }) => [styles.complete, pressed && styles.completePressed]}
          hitSlop={6}
        >
          {completing ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Text style={styles.completeText}>Done</Text>
          )}
        </Pressable>
      ) : (
        <Text style={styles.inactiveTag}>Done</Text>
      )}
    </View>
  );
}

function relativeDay(date: Date): string {
  const now = new Date();
  const ms = date.getTime() - now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round(ms / dayMs);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${-days} days ago`;
  if (days < 7) return `In ${days} days`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowOverdue: {
    borderColor: theme.colors.danger,
  },
  emoji: {
    fontSize: 22,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  firstLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  kind: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  plant: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  when: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  whenOverdue: {
    color: theme.colors.danger,
    fontWeight: '500',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.xs,
  },
  complete: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  completePressed: {
    backgroundColor: theme.colors.primary,
  },
  completeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  inactiveTag: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
});
