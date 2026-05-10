/**
 * Push notifications. MVP impl talks directly to APNs (HTTP/2 + JWT) and
 * FCM (HTTP v1 with service-account JSON), keeping us self-hosted.
 */

export type PushPlatform = 'ios' | 'android';

export interface PushTarget {
  platform: PushPlatform;
  /** APNs device token (hex) for iOS, FCM registration token for Android. */
  token: string;
}

export interface PushNotification {
  title: string;
  body: string;
  /** Custom payload delivered alongside the notification. */
  data?: Record<string, string>;
  /** iOS badge count override. */
  badge?: number;
}

export interface PushProvider {
  send(target: PushTarget, notification: PushNotification): Promise<{ id: string }>;
  sendMany(
    targets: PushTarget[],
    notification: PushNotification,
  ): Promise<Array<{ id: string; target: PushTarget }>>;
}
