/**
 * Transactional email — used by Better Auth for magic links and password
 * resets. MVP impl is Resend (free tier, 3k/mo).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ id: string }>;
}
