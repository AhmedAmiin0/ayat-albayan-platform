import { AWAITING_REPLY } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { AppSendExpiry } from './manual-send';
import { DAY_MS, orphaned } from './reopen-state';
import { heldWithoutTemplate, LOST } from './window-reopen';
import { answered, type WaitingRow } from './window-rules';
import { RELEASE_BATCH, WindowRepo } from './window.repo';

/** At most this many pages per pass (RELEASE_BATCH each): the rest wait for the next tick. */
const RELEASE_PAGES = 10;

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const phonesOf = (rows: readonly WaitingRow[]): string[] => [
  ...new Set(rows.map((r) => r.phone_e164)),
];

/** The earliest span the held rows' reopen templates can sit in (24 h before the first hold). */
const reopenSince = (rows: readonly WaitingRow[]): Date =>
  new Date(Math.min(...rows.map((r) => Date.parse(r.scheduled_for ?? r.created_at))) - DAY_MS);

/** Held texts are released on reply or failed when their reopen failed, never left for 7 days. */
@Injectable()
export class WindowRelease {
  private readonly log = new Logger('WindowRelease');

  constructor(
    private readonly repo: WindowRepo,
    private readonly expiry: AppSendExpiry,
  ) {}

  /** Never throws: the pass goes on. */
  async run(now = new Date()): Promise<number> {
    try {
      await this.expiry.run(now);
      const released = await this.page({ after: null, pages: RELEASE_PAGES, now });
      if (released > 0) this.log.log(`released ${released} held message(s)`);
      return released;
    } catch (e) {
      this.log.error(`held messages release failed: ${messageOf(e)}`);
      return 0;
    }
  }

  /** One page (after `after`), then the next while pages are full: at most `pages` per pass. */
  private async page(at: { after: string | null; pages: number; now: Date }): Promise<number> {
    const rows = await this.repo.waiting(at.after);
    // Held behind a template; one held without a template is never orphaned.
    const held = rows.filter((r) => r.expires_at !== null && !heldWithoutTemplate(r.error_text));
    const [inbound, reopens] = await Promise.all([
      this.repo.lastChatInbound(phonesOf(rows)),
      this.repo.reopens(phonesOf(held), reopenSince(held), true),
    ]);
    const due = answered(rows, inbound);
    const lost = orphaned(held.filter((r) => !due.includes(r.id)), reopens, at.now);
    const released = await this.repo.release(due);
    await this.repo.fail(lost, { ...LOST, from: AWAITING_REPLY });
    if (lost.length > 0) this.log.warn(`${lost.length} held message(s) failed: reopen not sent`);
    const full = rows.length === RELEASE_BATCH && at.pages > 1;
    const next = full ? rows.at(-1)?.created_at : undefined;
    const more = next ? await this.page({ after: next, pages: at.pages - 1, now: at.now }) : 0;
    return released + more;
  }
}
