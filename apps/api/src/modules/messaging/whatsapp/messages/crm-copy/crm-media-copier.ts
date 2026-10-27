import { HttpException, Injectable } from '@nestjs/common';
import { allowedCrmUrl, isCrmHistoryRow } from '../crm-history/crm-history-url';
import type { MediaMessage } from '../inbound-media.queries';
import { InboundMedia } from '../inbound-media.service';
import { CrmMediaCopyQueries } from './crm-media-copy.queries';

/** Per tick: small, so a tick stays short and the old CRM's storage is never hammered. */
export const BATCH = 20;
/** A row that failed this many times is left without a copy and counted as failed. */
export const MAX_ATTEMPTS = 3;

/** copied; retry (a failure below the cap); failed (at the cap); skipped (never ours to fetch). */
export type CopyOutcome = 'copied' | 'retry' | 'failed' | 'skipped';

/** Answers that will not change on a retry: not a chat file, gone row, not a CRM file, too large. */
const PERMANENT = new Set([400, 404, 409, 413]);

/** An imported CRM file we may copy: inbound, NO Meta media id, a crm number, the link on `host`. */
const copyable = (msg: MediaMessage, host: string): boolean =>
  msg.direction === 'inbound' && !msg.media_id && isCrmHistoryRow(msg) && msg.number?.provider === 'crm' && allowedCrmUrl(msg.body, host) !== null;

/** The error as a short code for crm_media_copy_failures (never a URL: waHttpError codes or the message). */
function reason(e: unknown): string {
  if (e instanceof HttpException) {
    const body = e.getResponse();
    return typeof body === 'object' && 'code' in body ? String(body.code) : e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * One imported CRM file into wa-media through the SAME path as an admin opening it (InboundMedia:
 * CrmHistoryMedia's host check and fetch caps, a deterministic path, setPath only where empty), so a
 * row copied lazily and by the job still has one object. A failure is marked, never thrown.
 */
@Injectable()
export class CrmMediaCopier {
  constructor(
    private readonly media: InboundMedia,
    private readonly queries: CrmMediaCopyQueries,
  ) {}

  next(host: string): Promise<string[]> {
    return this.queries.batch({ host, limit: BATCH, maxAttempts: MAX_ATTEMPTS });
  }

  async copy(id: string, host: string): Promise<CopyOutcome> {
    try {
      const msg = await this.media.loadChat(id);
      if (!copyable(msg, host)) return await this.mark({ id, error: 'not_copyable', skip: true });
      await this.media.cache(msg);
      return 'copied';
    } catch (e) {
      const skip = e instanceof HttpException && PERMANENT.has(e.getStatus());
      return this.mark({ id, error: reason(e), skip });
    }
  }

  private async mark(input: { id: string; error: string; skip: boolean }): Promise<CopyOutcome> {
    const attempts = await this.queries.mark(input);
    if (input.skip) return 'skipped';
    return attempts >= MAX_ATTEMPTS ? 'failed' : 'retry';
  }
}
