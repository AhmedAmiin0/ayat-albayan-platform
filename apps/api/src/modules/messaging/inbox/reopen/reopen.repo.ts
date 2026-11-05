import { Injectable } from '@nestjs/common';
import { ReopenRequest } from '@/modules/messaging/whatsapp';
import { ReopenSettings } from './reopen.settings';

/** The reopen's reads: the configured template, and the dedup key a new reopen goes under. */
@Injectable()
export class ReopenRepo {
  constructor(
    private readonly settings: ReopenSettings,
    private readonly request: ReopenRequest,
  ) {}

  /** The `chat_reopen_template` setting (default welcome_greeting; no fallback key). */
  async templateKey(): Promise<string> {
    return (await this.settings.read()).chat_reopen_template;
  }

  /**
   * The dedup key for a new reopen of this phone (`reopen:<E.164>:<Riyadh day>`, `:2`… after a
   * failed try); null = one is pending or went out in the last 24 h (any template), or today's
   * tries are used. A failed or expired one never blocks (merge-gate review 2026-11-05).
   */
  nextKey(phone: string, now: Date): Promise<string | null> {
    return this.request.nextKey(phone, now);
  }
}
