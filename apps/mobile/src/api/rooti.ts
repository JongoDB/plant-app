import { authClient } from '../auth/client';
import { env } from '../config/env';

/**
 * Streaming client for the Rooti SSE endpoint.
 *
 * RN with the new architecture (Hermes + Fabric, RN 0.83+) supports
 * `response.body.getReader()` natively. If that ever changes we can swap
 * in `react-native-sse` or `react-native-fetch-api` behind this same API.
 */

export interface RootiStreamOptions {
  conversationId?: string;
  anchorPlantId?: string;
  text: string;
  /** IDs of already-uploaded photos to attach to this turn. */
  photoIds?: string[];
  /** Caller's location, attached so weather can be in Rooti's context. */
  location?: { lat: number; lng: number };
  onConversation?: (id: string) => void;
  onTextDelta?: (text: string) => void;
  onToolUseStart?: (id: string, name: string) => void;
  onToolResult?: (id: string, output: unknown) => void;
  onToolError?: (id: string, message: string) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

export async function streamRootiMessage(opts: RootiStreamOptions): Promise<void> {
  const cookie = authClient.getCookie();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${env.API_URL}/rooti/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversationId: opts.conversationId,
      anchorPlantId: opts.anchorPlantId,
      text: opts.text,
      ...(opts.photoIds && opts.photoIds.length > 0 ? { photoIds: opts.photoIds } : {}),
      ...(opts.location ? { location: opts.location } : {}),
    }),
    credentials: 'omit',
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Rooti request failed (${res.status}): ${body || res.statusText}`);
  }
  if (!res.body) {
    throw new Error('Streaming not available — your runtime does not expose response.body.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: events separated by blank line. Hold the trailing partial.
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      handleEventBlock(block, opts);
    }
  }

  // Flush any final block (the server emits 'done' followed by \n\n, so
  // this is mostly defensive).
  if (buffer.trim()) handleEventBlock(buffer, opts);
}

function handleEventBlock(block: string, opts: RootiStreamOptions): void {
  let eventName = '';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event: ')) eventName = line.slice(7).trim();
    else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
  }
  if (!eventName) return;

  let payload: unknown;
  try {
    payload = JSON.parse(dataLines.join('\n'));
  } catch {
    return;
  }
  const data = payload as Record<string, unknown>;

  switch (eventName) {
    case 'conversation':
      if (typeof data.id === 'string') opts.onConversation?.(data.id);
      break;
    case 'text_delta':
      if (typeof data.text === 'string') opts.onTextDelta?.(data.text);
      break;
    case 'tool_use_start':
      if (typeof data.id === 'string' && typeof data.name === 'string') {
        opts.onToolUseStart?.(data.id, data.name);
      }
      break;
    case 'tool_result':
      if (typeof data.id === 'string') opts.onToolResult?.(data.id, data.output);
      break;
    case 'tool_error':
      if (typeof data.id === 'string' && typeof data.message === 'string') {
        opts.onToolError?.(data.id, data.message);
      }
      break;
    case 'error':
      if (typeof data.message === 'string') opts.onError?.(data.message);
      break;
    case 'done':
      opts.onDone?.();
      break;
  }
}
