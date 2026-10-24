import { overlayNumbers } from '../../common/integrations/numbers-overlay';
import { allowedRecipients, loadEnv } from '../../env';
import { HttpWhatsappClient } from './whatsapp.client';
import type { WhatsappClient } from './whatsapp.types';

/**
 * One client per number (module mode, docs/23 phase 5, docs/23c), built from that number's own config
 * in the numbers overlay (never another number's token) and the WA_ALLOWED_RECIPIENTS allow-list. Like
 * live-client.ts, an HttpWhatsappClient is rebuilt only when the number's config or the allow-list
 * changed. Holds tokens in memory only: never log a cached entry.
 */
export class NumberClients {
  private readonly cached = new Map<string, { fingerprint: string; client: HttpWhatsappClient }>();

  /** null = unknown number, disabled, cannot send (no working credentials) or legacy mode. */
  client(numberId: string): WhatsappClient | null {
    const n = overlayNumbers()?.find((x) => x.id === numberId);
    if (!n?.enabled || !n.env) {
      this.cached.delete(numberId);
      return null;
    }
    const allowed = allowedRecipients(loadEnv());
    // In memory only, compared and dropped: the token is part of the key so a new token takes effect.
    const fingerprint = JSON.stringify([n.env, allowed]);
    const hit = this.cached.get(numberId);
    if (hit?.fingerprint === fingerprint) return hit.client;
    const client = new HttpWhatsappClient(n.env, { allowed });
    this.cached.set(numberId, { fingerprint, client });
    return client;
  }
}
