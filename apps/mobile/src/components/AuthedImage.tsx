import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, View, type ImageStyle, type ViewStyle } from 'react-native';

import { env } from '../config/env';
import { authClient } from '../auth/client';
import { theme } from '../theme';

/**
 * Cookie-aware image. Different paths per platform:
 *
 *  Native: <Image source={{ uri, headers: { Cookie } }} /> — RN's image
 *  loader supports per-source headers, so the manual Cookie attaches and
 *  the request reaches /photos/:id authenticated.
 *
 *  Web: HTML <img> ignores explicit headers AND doesn't auto-send cookies
 *  to cross-origin URLs without `crossOrigin="use-credentials"` (which
 *  React Native Web doesn't reliably forward). Cleanest workaround: fetch
 *  the bytes ourselves with `credentials: 'include'`, turn the resulting
 *  Blob into an object URL, and pass that to <Image>. The blob URL is
 *  same-origin so no further auth questions arise.
 *
 * The render shows a small ActivityIndicator while the web fetch is in
 * flight. URLs are revoked on unmount.
 */

interface Props {
  photoId: string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
}

export function AuthedImage({ photoId, style, containerStyle }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let active = true;
    let createdUrl: string | null = null;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${env.API_URL}/photos/${photoId}`, {
          credentials: 'include',
        });
        if (!res.ok || !active) return;
        const blob = await res.blob();
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setUri(createdUrl);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [photoId]);

  if (Platform.OS !== 'web') {
    const cookie = authClient.getCookie();
    const headers: Record<string, string> = {};
    if (cookie) headers['Cookie'] = cookie;
    return (
      <Image
        source={{
          uri: `${env.API_URL}/photos/${photoId}`,
          ...(Object.keys(headers).length > 0 ? { headers } : {}),
        }}
        style={style}
      />
    );
  }

  if (loading || !uri) {
    return (
      <View
        style={[
          { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
          style as ViewStyle,
          containerStyle,
        ]}
      >
        <ActivityIndicator color={theme.colors.primary} size="small" />
      </View>
    );
  }
  return <Image source={{ uri }} style={style} />;
}
