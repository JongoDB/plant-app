// Slice 1 replaces this with ResendEmailProvider (free tier).
import type { EmailMessage, EmailProvider } from '@plant-app/shared';

export class StubEmailProvider implements EmailProvider {
  async send(_msg: EmailMessage): Promise<{ id: string }> {
    throw new Error('EmailProvider not wired yet — see Slice 1 (auth + magic link).');
  }
}
