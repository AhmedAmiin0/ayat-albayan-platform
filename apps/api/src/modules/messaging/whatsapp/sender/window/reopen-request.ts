import type { TablesInsert } from '@ab/db';
import { reopenChoiceOf, type ReopenChoice, type TemplateView } from '@ab/shared';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { DAY_MS, nextReopenKey, reopenRequested, type ReopenRow } from './reopen-state';
import {
  NO_TEMPLATE_NOTE,
  reopenRow,
  TRIES_USED,
  UNAVAILABLE,
  type FailWhy,
  type HoldPlan,
} from './window-reopen';
import { reopenUsable } from './window-rules';
import { WindowRepo } from './window.repo';
import { WindowSettings } from './window.settings';
import { ReopenCancel } from './manual-send';
import { ReopenAudit } from './reopen-audit';

/** One way to read the reopen template by key: fresh (a send) or the 60 s copy (the note). */
type ReadTemplate = (key: string) => Promise<TemplateView | null>;

const last4 = (phone: string): string => `…${phone.slice(-4)}`;
const HELD: HoldPlan = { note: null };
const WAIT: HoldPlan = { note: NO_TEMPLATE_NOTE };
const failNow = (why: FailWhy): HoldPlan => ({ fail: why, note: null });

/**
 * The reopen template a held text needs (owner 2026-11-03; merge-gate review 2026-11-05): one that
 * is pending or went out in the last 24 h counts; a failed or expired one does not, and the next
 * try is queued under its own dedup key (at most REOPEN_TRIES a day). When none is live and none
 * can be queued, the caller fails the text at once with the reason (never held with nothing sent).
 * «بدون قالب» (owner 2026-11-06): nothing is queued and the text waits for the family (WAIT).
 */
@Injectable()
export class ReopenRequest {
  private readonly log = new Logger('ReopenRequest');
  /** Property-injected (the constructor is at its limit); absent (a bare test): no audit line. */
  @Optional() @Inject(ReopenAudit) audit?: ReopenAudit;

  constructor(
    private readonly repo: WindowRepo,
    private readonly templates: TemplateRegistry,
    private readonly settings: WindowSettings,
    private readonly cancels: ReopenCancel,
  ) {}

  /** The admin's choice (owner 2026-11-06): a starter template, or «بدون قالب» (wait). */
  async choice(): Promise<ReopenChoice> {
    return reopenChoiceOf((await this.settings.read()).chat_reopen_template);
  }

  /** The `chat_reopen_template` when usable (reopenUsable: an approved chat-line starter). */
  template(): Promise<TemplateView | null> {
    return this.usableBy((key) => this.templates.approved(key));
  }

  /** The composer's note reads the 60 s copy (docs/42 42-3); the queue reads it fresh. */
  private noteTemplate(): Promise<TemplateView | null> {
    return this.usableBy((key) => this.templates.approvedCached(key));
  }

  private async usableBy(read: ReadTemplate): Promise<TemplateView | null> {
    const key = (await this.settings.read()).chat_reopen_template.trim();
    const template = key ? await read(key) : null;
    return reopenUsable(template) ? template : null;
  }

  /** What a closed chat does after the window (the composer's note); null = it cannot reopen. */
  async usable(): Promise<ReopenChoice | null> {
    const usable: Record<ReopenChoice, () => Promise<boolean>> = {
      template: async () => (await this.noteTemplate()) !== null,
      wait: () => Promise.resolve(true),
    };
    const choice = await this.choice();
    return (await usable[choice]()) ? choice : null;
  }

  /** How a closed chat's text is held: behind a template (queued if none is live), or waiting. */
  async ensure(row: DueMessage, now: Date): Promise<HoldPlan> {
    const plans: Record<ReopenChoice, () => Promise<HoldPlan>> = {
      template: () => this.withTemplate(row, now),
      wait: () => Promise.resolve(WAIT),
    };
    return plans[await this.choice()]();
  }

  /** A reopen is live or was just queued: held; else why the text fails now. */
  private async withTemplate(row: DueMessage, now: Date): Promise<HoldPlan> {
    const phone = row.phone_e164;
    const rows = await this.lastDay(phone, now);
    if (reopenRequested(rows, now)) return HELD;
    const template = await this.template();
    const dedup = nextReopenKey(phone, rows, now);
    if (!template || !dedup) return failNow(template ? TRIES_USED : UNAVAILABLE);
    await this.queue(reopenRow(row, { key: template.key, dedup, now }));
    return { ...HELD, queued: dedup };
  }

  /** Queued (deduped) and, when this pass inserted it, audited under the sender. */
  private async queue(reopen: TablesInsert<'messages'>): Promise<void> {
    const id = await this.repo.queueReopen(reopen);
    if (id) await this.audit?.record(reopen, id);
    this.log.log(`reopen template ${reopen.template_key ?? ''} queued for ${last4(reopen.phone_e164)}`);
  }

  /** The hold this plan was for missed: the reopen it queued goes unless a text still waits. */
  async drop(phone: string, plan: HoldPlan): Promise<void> {
    if (plan.queued) await this.cancels.dropLost(phone, plan.queued);
  }

  private lastDay(phone: string, now: Date): Promise<ReopenRow[]> {
    return this.repo.reopens([phone], new Date(now.getTime() - DAY_MS));
  }
}
