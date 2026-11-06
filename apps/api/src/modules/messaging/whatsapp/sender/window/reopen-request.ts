import { reopenChoiceOf, type ReopenChoice, type TemplateView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
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

  constructor(
    private readonly repo: WindowRepo,
    private readonly templates: TemplateRegistry,
    private readonly settings: WindowSettings,
  ) {}

  /** The admin's choice (owner 2026-11-06): a starter template, or «بدون قالب» (wait). */
  async choice(): Promise<ReopenChoice> {
    return reopenChoiceOf((await this.settings.read()).chat_reopen_template);
  }

  /** The `chat_reopen_template` when usable (reopenUsable: an approved chat-line starter). */
  async template(): Promise<TemplateView | null> {
    const key = (await this.settings.read()).chat_reopen_template.trim();
    const template = key ? await this.templates.approved(key) : null;
    return reopenUsable(template) ? template : null;
  }

  /** What a closed chat does after the window (the composer's note); null = it cannot reopen. */
  async usable(): Promise<ReopenChoice | null> {
    const usable: Record<ReopenChoice, () => Promise<boolean>> = {
      template: async () => (await this.template()) !== null,
      wait: () => Promise.resolve(true),
    };
    const choice = await this.choice();
    return (await usable[choice]()) ? choice : null;
  }

  /** A new reopen's key now (the thread-open path); null = one is live, or no try left today. */
  async nextKey(phone: string, now: Date): Promise<string | null> {
    const rows = await this.lastDay(phone, now);
    return reopenRequested(rows, now) ? null : nextReopenKey(phone, rows, now);
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
    await this.repo.queueReopen(reopenRow(row, { key: template.key, dedup, now }));
    this.log.log(`reopen template ${template.key} queued for ${last4(phone)}`);
    return HELD;
  }

  private lastDay(phone: string, now: Date): Promise<ReopenRow[]> {
    return this.repo.reopens([phone], new Date(now.getTime() - DAY_MS));
  }
}
