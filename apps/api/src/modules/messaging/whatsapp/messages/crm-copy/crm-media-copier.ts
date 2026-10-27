import { HttpException, Injectable, Logger } from '@nestjs/common';
import { allowedCrmUrl, isCrmHistoryRow } from '../crm-history/crm-history-url';
import { CRM_UNREACHABLE } from '../crm-history/crm-media.fetch';
import type { MediaMessage } from '../inbound-media.queries';
import { InboundMedia } from '../inbound-media.service';
import { CrmMediaCopyQueries } from './crm-media-copy.queries';

/** Per tick: small, so a tick stays short and the old CRM's storage is never hammered. */
export const BATCH = 20;
/** A row that failed this many times is left without a copy and counted as failed. */
export const MAX_ATTEMPTS = 3;

/**
 * copied; retry (a failure below the cap); failed (at the cap); skipped (never ours to fetch);
 * unreachable (the CRM's storage did not answer: no attempt counted, the job stops its tick).
 */
export type CopyOutcome = 'copied' | 'retry' | 'failed' | 'skipped' | 'unreachable';

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
  private readonly log = new Logger(CrmMediaCopier.name);

  constructor(
    private readonly media: InboundMedia,
    private readonly queries: CrmMediaCopyQueries,
  ) {}

  next(host: string): Promise<string[]> {
    return this.queries.batch({ host, limit: BATCH, maxAttempts: MAX_ATTEMPTS });
  }

  async copy(id: string, host: string): Promise<CopyOutcome> {
    const failure = await this.attempt(id, host);
    if (!failure) return 'copied';
    // An outage says nothing about the file: counting it would burn every row's attempts in minutes.
    if (failure.error === CRM_UNREACHABLE) return 'unreachable';
    // A row deleted meanwhile has no failure to record (the foreign key) and never comes back.
    if (failure.status === 404) return 'skipped';
    return this.mark({ id, error: failure.error, skip: failure.skip });
  }

  /** null = copied (or already cached); else why not. */
  private async attempt(id: string, host: string): Promise<{ error: string; skip: boolean; status: number } | null> {
    try {
      const msg = await this.media.loadChat(id);
      if (!copyable(msg, host)) return { error: 'not_copyable', skip: true, status: 0 };
      await this.media.cache(msg);
      return null;
    } catch (e) {
      const status = e instanceof HttpException ? e.getStatus() : 0;
      return { error: reason(e), skip: PERMANENT.has(status), status };
    }
  }

  /** Recorded once; a failing write is logged and read as a retry (the row is selected again). */
  private async mark(input: { id: string; error: string; skip: boolean }): Promise<CopyOutcome> {
    try {
      const attempts = await this.queries.mark(input);
      if (input.skip) return 'skipped';
      return attempts >= MAX_ATTEMPTS ? 'failed' : 'retry';
    } catch (e) {
      this.log.error(`crm media copy mark failed: ${String(e)}`);
      return 'retry';
    }
  }
}
