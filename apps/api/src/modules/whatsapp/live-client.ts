import type { WaLine } from '@ab/shared';
import { allowedRecipients, lineEnvs, loadEnv } from '../../env';
import { HttpWhatsappClient } from './whatsapp.client';
import type { WhatsappClient } from './whatsapp.types';

/**
 * One line's client that reads its config per call (integration config in the database, owner
 * 2026-10-12): an admin's change of a WA_* value or token applies to the next call, no restart. The
 * HttpWhatsappClient is rebuilt only when that line's config (or the allow-list) changed.
 */
export class LiveWhatsappClient implements WhatsappClient {
  private cached: { fingerprint: string; client: HttpWhatsappClient } | null = null;

  constructor(private readonly line: WaLine) {}

  configured(): boolean {
    return this.current().configured();
  }
  canUploadSamples(): boolean {
    return this.current().canUploadSamples();
  }
  sendTemplate(...a: Parameters<WhatsappClient['sendTemplate']>): ReturnType<WhatsappClient['sendTemplate']> {
    return this.current().sendTemplate(...a);
  }
  sendText(...a: Parameters<WhatsappClient['sendText']>): ReturnType<WhatsappClient['sendText']> {
    return this.current().sendText(...a);
  }
  sendDocument(...a: Parameters<WhatsappClient['sendDocument']>): ReturnType<WhatsappClient['sendDocument']> {
    return this.current().sendDocument(...a);
  }
  markRead(waMessageId: string): Promise<void> {
    return this.current().markRead(waMessageId);
  }
  getTemplates(): ReturnType<WhatsappClient['getTemplates']> {
    return this.current().getTemplates();
  }
  submitTemplate(...a: Parameters<WhatsappClient['submitTemplate']>): ReturnType<WhatsappClient['submitTemplate']> {
    return this.current().submitTemplate(...a);
  }
  uploadSample(...a: Parameters<WhatsappClient['uploadSample']>): ReturnType<WhatsappClient['uploadSample']> {
    return this.current().uploadSample(...a);
  }
  getMedia(mediaId: string): ReturnType<WhatsappClient['getMedia']> {
    return this.current().getMedia(mediaId);
  }

  private current(): HttpWhatsappClient {
    const env = loadEnv();
    const conn = lineEnvs(env)[this.line];
    const allowed = allowedRecipients(env);
    // In memory only, compared and dropped: the token is part of the key so a new token takes effect.
    const fingerprint = JSON.stringify([conn, allowed]);
    if (this.cached?.fingerprint !== fingerprint) this.cached = { fingerprint, client: new HttpWhatsappClient(conn, { allowed }) };
    return this.cached.client;
  }
}
