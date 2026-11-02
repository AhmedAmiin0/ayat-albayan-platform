import { HttpException, Injectable, Logger } from '@nestjs/common';
import { allowedCrmUrl, isCrmHistoryRow } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history-url';
import { CRM_UNREACHABLE } from '@/modules/messaging/whatsapp/messages/crm-history/crm-media.fetch';
import type { MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';
import { InboundMedia } from '@/modules/messaging/whatsapp/messages/inbound-media.service';
import { CrmMediaCopyRepo } from './crm-media-copy.repo';

/** Per tick: small, so a tick stays short and the old CRM's storage is never hammered. */
export const BATCH = 20;
/** A row that failed this many times is left without a copy and counted as failed. */
export const MAX_ATTEMPTS = 3;
/**
 * Outage rounds (about a minute each) a row may stay unanswered before it counts one attempt anyway: an
 * outage burns no attempt for half an hour, and a last file that never answers still ends the run.
 */
export const UNREACHABLE_PATIENCE = 30;

/**
 * copied; retry (a failure below the cap); failed (at the cap); skipped (never ours to fetch);
 * unreachable (the CRM's storage answered no row of the round: no attempt counted, the job stops its tick).
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
  /** Outage rounds each row has waited so far (in memory: a restart starts the patience again). */
  private readonly waiting = new Map<string, number>();

  constructor(
    private readonly media: InboundMedia,
    private readonly queries: CrmMediaCopyRepo,
  ) {}

  next(host: string): Promise<string[]> {
    return this.queries.batch({ host, limit: BATCH, maxAttempts: MAX_ATTEMPTS });
  }

  /**
   * Copies run together. A round the storage answered for none of its rows is an outage (all
   * 'unreachable', no attempt counted, up to UNREACHABLE_PATIENCE rounds a row); once it answered any
   * of them it is up, so a row it did not answer (a file that always times out or 5xx) counts an
   * attempt and cannot block the batch's head.
   */
  async round(ids: readonly string[], host: string): Promise<CopyOutcome[]> {
    const done = await Promise.all(ids.map(async (id) => ({ id, outcome: await this.copy(id, host) })));
    const outage = done.every((d) => d.outcome === 'unreachable');
    return Promise.all(done.map((d) => (d.outcome === 'unreachable' ? this.unanswered(d.id, outage) : this.forget(d.id, d.outcome))));
  }

  /** In an outage only past the patience; else (the storage is up) at once: one more failed attempt. */
  private unanswered(id: string, outage: boolean): Promise<CopyOutcome> {
    const rounds = (this.waiting.get(id) ?? 0) + 1;
    if (outage && rounds < UNREACHABLE_PATIENCE) {
      this.waiting.set(id, rounds);
      return Promise.resolve('unreachable');
    }
    return this.forget(id, this.mark({ id, error: CRM_UNREACHABLE, skip: false }));
  }

  private async forget(id: string, outcome: CopyOutcome | Promise<CopyOutcome>): Promise<CopyOutcome> {
    this.waiting.delete(id);
    return outcome;
  }

  async copy(id: string, host: string): Promise<CopyOutcome> {
    const failure = await this.attempt(id, host);
    if (!failure) return 'copied';
    // An outage says nothing about the file: counting it would burn every row's attempts in minutes (round decides).
    if (failure.error === CRM_UNREACHABLE) return 'unreachable';
    // A row deleted meanwhile has no failure to record (the foreign key) and never comes back.
    if (failure.status === 404) return 'skipped';
    return this.mark({ id, error: failure.error, skip: failure.skip });
  }

  /** null = copied (or already cached); else why not. */
  private async attempt(id: string, host: string): Promise<{ error: string; skip: boolean; status: number } | null> {
    let loaded = false;
    try {
      const msg = await this.media.loadChat(id);
      loaded = true;
      if (!copyable(msg, host)) return { error: 'not_copyable', skip: true, status: 0 };
      await this.media.cache(msg);
      return null;
    } catch (e) {
      const status = e instanceof HttpException ? e.getStatus() : 0;
      // The gate's 410 (a file with no usable link, servable) never changes; a fetch's 410 may.
      return { error: reason(e), skip: PERMANENT.has(status) || (status === 410 && !loaded), status };
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
