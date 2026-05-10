import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { uploadPhoto } from '../src/api/photos';
import { RequireAuth } from '../src/components/RequireAuth';
import { theme } from '../src/theme';
import {
  pickFromCamera,
  pickFromLibrary,
  type PickedImage,
} from '../src/utils/imagePicker';
import { getLocation, type LatLng } from '../src/utils/location';

type ToolEvent =
  | { kind: 'pending'; id: string; name: string }
  | { kind: 'result'; id: string; name: string; output: unknown }
  | { kind: 'error'; id: string; name: string; message: string };

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tools: ToolEvent[];
  /** Local URI for an attached image (user messages only, just-attached). */
  photoLocalUri?: string;
  /** True while an assistant message is still streaming. */
  pending?: boolean;
}

interface PendingPhoto {
  photoId: string;
  localUri: string;
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
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const conversationIdRef = useRef<string | undefined>(undefined);
  const locationRef = useRef<LatLng | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Best-effort location fetch on chat open. We don't block on it — if the
  // user denies, Rooti just answers without weather context.
  useEffect(() => {
    void (async () => {
      const loc = await getLocation();
      locationRef.current = loc;
    })();
  }, []);

  const headerTitle = plantName
    ? `${branding.ASSISTANT_NAME} · ${plantName}`
    : branding.ASSISTANT_NAME;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const attach = useCallback(
    async (picker: () => Promise<PickedImage | null>) => {
      setError(undefined);
      setAttaching(true);
      try {
        const picked = await picker();
        if (!picked) return;
        const uploaded = await uploadPhoto({
          uri: picked.uri,
          mimeType: picked.mimeType,
          width: picked.width,
          height: picked.height,
          plantId,
        });
        setPendingPhoto({ photoId: uploaded.id, localUri: picked.uri });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setAttaching(false);
      }
    },
    [plantId],
  );

  const onAttachPress = () => {
    Alert.alert('Attach a photo', undefined, [
      { text: 'Take photo', onPress: () => void attach(pickFromCamera) },
      { text: 'Choose from library', onPress: () => void attach(pickFromLibrary) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && !pendingPhoto) || streaming) return;
    setError(undefined);
    setInput('');
    const photoToSend = pendingPhoto;
    setPendingPhoto(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text || (photoToSend ? '(photo)' : ''),
      tools: [],
      ...(photoToSend ? { photoLocalUri: photoToSend.localUri } : {}),
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
        text: text || 'Take a look at this photo.',
        photoIds: photoToSend ? [photoToSend.photoId] : undefined,
        ...(locationRef.current ? { location: locationRef.current } : {}),
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
  }, [input, pendingPhoto, streaming, plantId, scrollToEnd]);

  const sendDisabled = (!input.trim() && !pendingPhoto) || streaming;

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
                  ? `Ask me anything about ${plantName}, or attach a photo for a closer look.`
                  : 'Ask me anything about your plants, or attach a photo for a closer look.'}
              </Text>
            </View>
          }
          onContentSizeChange={scrollToEnd}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {pendingPhoto ? (
          <View style={styles.pendingBar}>
            <Image source={{ uri: pendingPhoto.localUri }} style={styles.pendingThumb} />
            <Text style={styles.pendingLabel}>Photo ready to send</Text>
            <Pressable
              hitSlop={8}
              onPress={() => setPendingPhoto(null)}
              style={styles.pendingClose}
            >
              <Text style={styles.pendingCloseText}>✕</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <Pressable
            style={[styles.attachButton, (attaching || streaming) && styles.disabled]}
            onPress={onAttachPress}
            disabled={attaching || streaming}
            hitSlop={6}
          >
            {attaching ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Text style={styles.attachIcon}>＋</Text>
            )}
          </Pressable>
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
            style={[styles.sendButton, sendDisabled && styles.disabled]}
            onPress={send}
            disabled={sendDisabled}
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
        {message.photoLocalUri ? (
          <Image
            source={{ uri: message.photoLocalUri }}
            style={styles.bubblePhoto}
            resizeMode="cover"
          />
        ) : null}
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
  bubblePhoto: {
    width: 220,
    height: 220,
    borderRadius: theme.radii.md,
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
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pendingThumb: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.sm,
  },
  pendingLabel: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  pendingClose: {
    paddingHorizontal: theme.spacing.sm,
  },
  pendingCloseText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.lg,
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
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: {
    fontSize: 22,
    color: theme.colors.primary,
    lineHeight: 22,
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
  disabled: {
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
