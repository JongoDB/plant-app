// Replaced in the care-reminders / notifications slice with direct APNs + FCM
// senders. We keep this self-hosted (no Expo Push) so the API talks to Apple
// and Google directly.
import type {
  PushNotification,
  PushProvider,
  PushTarget,
} from '@plant-app/shared';

export class StubPushProvider implements PushProvider {
  async send(_target: PushTarget, _notification: PushNotification): Promise<{ id: string }> {
    throw new Error('PushProvider not wired yet — see notifications slice.');
  }
  async sendMany(
    _targets: PushTarget[],
    _notification: PushNotification,
  ): Promise<Array<{ id: string; target: PushTarget }>> {
    throw new Error('PushProvider not wired yet — see notifications slice.');
  }
}
