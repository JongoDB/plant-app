import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { branding } from '@plant-app/shared';

import { streamRootiMessage } from '../src/api/rooti';
import { RequireAuth } from '../src/components/RequireAuth';
import { theme } from '../src/theme';

type ToolEvent =
  | { kind: 'pending'; id: string; name: string }
  | { kind: 'result'; id: string; name: string; output: unknown }
  | { kind: 'error'; id: string; name: string; message: string };

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tools: ToolEvent[];
  /** True while the assistant message is still streaming. */
  pending?: boolean;
}

export default function RootiScreen() {
  return (
    <RequireAuth>
      <RootiChat />
    </RequireAuth>
  );
}

function RootiChat() {
  const { plantId, plantName } = useLocalSearchParams<{
    plantId?: string;
    plantName?: string;
  }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const conversationIdRef = useRef<string | undefined>(undefined);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const headerTitle = plantName ? `${branding.ASSISTANT_NAME} · ${plantName}` : branding.ASSISTANT_NAME;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setError(undefined);
    setInput('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      tools: [],
    };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      tools: [],
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    scrollToEnd();

    const updateAssistant = (mut: (m: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? mut(m) : m)));
    };

    try {
      await streamRootiMessage({
        conversationId: conversationIdRef.current,
        anchorPlantId: plantId,
        text,
        onConversation: (id) => {
          conversationIdRef.current = id;
        },
        onTextDelta: (delta) => {
          updateAssistant((m) => ({ ...m, text: m.text + delta }));
          scrollToEnd();
        },
        onToolUseStart: (id, name) => {
          updateAssistant((m) => ({
            ...m,
            tools: [...m.tools, { kind: 'pending', id, name }],
          }));
        },
        onToolResult: (id, output) => {
          updateAssistant((m) => ({
            ...m,
            tools: m.tools.map((t) =>
              t.id === id ? { kind: 'result', id, name: t.name, output } : t,
            ),
          }));
        },
        onToolError: (id, message) => {
          updateAssistant((m) => ({
            ...m,
            tools: m.tools.map((t) =>
              t.id === id ? { kind: 'error', id, name: t.name, message } : t,
            ),
          }));
        },
        onError: (message) => {
          setError(message);
        },
        onDone: () => {
          updateAssistant((m) => ({ ...m, pending: false }));
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      updateAssistant((m) => ({ ...m, pending: false }));
    } finally {
      setStreaming(false);
      scrollToEnd();
    }
  }, [input, streaming, plantId, scrollToEnd]);

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Hi, I'm {branding.ASSISTANT_NAME}.</Text>
              <Text style={styles.emptyHint}>
                {plantName
                  ? `Ask me anything about ${plantName}.`
                  : 'Ask me anything about your plants.'}
              </Text>
            </View>
          }
          onContentSizeChange={scrollToEnd}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={`Ask ${branding.ASSISTANT_NAME}…`}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            editable={!streaming}
            onSubmitEditing={send}
            blurOnSubmit
          />
          <Pressable
            style={[styles.sendButton, (!input.trim() || streaming) && styles.sendButtonDisabled]}
            onPress={send}
            disabled={!input.trim() || streaming}
          >
            {streaming ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {message.tools.map((t) => (
          <ToolCard key={t.id} tool={t} />
        ))}
        {message.text ? (
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : undefined]}>
            {message.text}
          </Text>
        ) : message.pending ? (
          <ActivityIndicator color={theme.colors.primary} size="small" />
        ) : null}
      </View>
    </View>
  );
}

function ToolCard({ tool }: { tool: ToolEvent }) {
  switch (tool.kind) {
    case 'pending':
      return (
        <View style={styles.toolCard}>
          <ActivityIndicator color={theme.colors.primary} size="small" />
          <Text style={styles.toolText}>{describeTool(tool.name)}…</Text>
        </View>
      );
    case 'result':
      return (
        <View style={styles.toolCard}>
          <Text style={styles.toolBadge}>✓</Text>
          <Text style={styles.toolText}>{describeTool(tool.name)}</Text>
        </View>
      );
    case 'error':
      return (
        <View style={[styles.toolCard, styles.toolCardError]}>
          <Text style={styles.toolBadgeError}>!</Text>
          <Text style={styles.toolText}>
            {describeTool(tool.name)} — {tool.message}
          </Text>
        </View>
      );
  }
}

function describeTool(name: string): string {
  switch (name) {
    case 'log_care_event':
      return 'Logging care event';
    case 'add_plant':
      return 'Adding plant';
    case 'save_plant_note':
      return 'Saving note';
    case 'schedule_reminder':
      return 'Scheduling reminder';
    case 'identify_plant':
      return 'Identifying plant';
    default:
      return name;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  empty: {
    paddingTop: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyHint: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    gap: theme.spacing.xs,
  },
  bubbleUser: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: theme.radii.sm,
  },
  bubbleAssistant: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: theme.radii.sm,
  },
  bubbleText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: theme.colors.surface,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toolCardError: {
    borderColor: theme.colors.danger,
  },
  toolBadge: {
    color: theme.colors.success,
    fontWeight: '700',
  },
  toolBadgeError: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  toolText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  sendButton: {
    height: 44,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
});
