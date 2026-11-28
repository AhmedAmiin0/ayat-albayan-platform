import { Injectable, Logger } from '@nestjs/common';
import { integrationRefreshMs } from '@/common/configuration/integrations/integration-refresh';
import { loadEnv } from '@/config/env/env';
import { NumbersRepo, type NumberRow } from '@/modules/messaging/numbers/numbers.repo';
import { OwnTrafficRepo } from './own-traffic.repo';

const MIN_TTL_MS = 1_000;
const WEEK_MS = 7 * 24 * 3_600_000;
const NONE: ReadonlySet<string> = new Set();

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Every number's display phone (enabled or not), exactly as stored: E.164, no normalising guess.
 */
export function ownPhonesOf(rows: readonly Pick<NumberRow, 'display_phone_e164'>[]): ReadonlySet<string> {
  return new Set(rows.flatMap((r) => (r.display_phone_e164 ? [r.display_phone_e164] : [])));
}

/** A PostgREST `in` list of phones, each quoted: «("+966…","+20…")». */
export function phoneList(phones: Iterable<string>): string {
  return `(${[...phones].map((p) => `"${p.replace(/"/g, '')}"`).join(',')})`;
}

/**
 * The academy's own WhatsApp numbers: every wa_numbers.display_phone_e164. A message
 * from one of them (the old Apps Script's reminders, sent from the notifications number to the chat
 * number) is kept as a row but is never a customer: no lead, push, unread or list entry. Read
 * through NumbersQueries, cached for the integration refresh period and dropped after every numbers
 * write (NumbersEffects), so a new number row is picked up. Never throws: a failed read keeps the
 * last set (none yet = nobody is hidden, so a family's chat is never lost).
 * INTEGRATION_CONFIG_FROM_DB=false (unit tests, env-only runs): never reads, nobody is hidden.
 */
@Injectable()
export class OwnNumbers {
  private readonly log = new Logger(OwnNumbers.name);
  private cached: { phones: ReadonlySet<string>; at: number } | null = null;

  constructor(
    private readonly queries: NumbersRepo,
    private readonly traffic: OwnTrafficRepo,
  ) {}

  async phones(now = Date.now()): Promise<ReadonlySet<string>> {
    const everyMs = integrationRefreshMs(loadEnv());
    if (everyMs === null) return NONE;
    if (!this.isFresh(now, everyMs)) await this.load(now);
    return this.cached?.phones ?? NONE;
  }

  private isFresh(now: number, everyMs: number): boolean {
    return this.cached !== null && now - this.cached.at < Math.max(everyMs, MIN_TTL_MS);
  }

  private async load(now: number): Promise<void> {
    try {
      this.cached = { phones: ownPhonesOf(await this.queries.all()), at: now };
    } catch (e) {
      this.log.warn(`own numbers not loaded, keeping the last set: ${errorText(e)}`);
    }
  }

  /** Exact E.164 match only. */
  async has(phone: string): Promise<boolean> {
    return (await this.phones()).has(phone);
  }

  /**
   * `phoneList` of our numbers for a `.not('phone_e164', 'in', …)`; null = none known (no filter).
   */
  async notIn(): Promise<string | null> {
    const phones = await this.phones();
    return phones.size > 0 ? phoneList(phones) : null;
  }

  /**
   * After a numbers write: the next read loads the rows again (a failed one still keeps this set).
   */
  forget(): void {
    if (this.cached) this.cached = { ...this.cached, at: Number.NEGATIVE_INFINITY };
  }

  /** Inbound rows from our own numbers in the last 7 days (hidden everywhere). */
  async weekInbound(now = new Date()): Promise<number> {
    const phones = await this.phones(now.getTime());
    if (phones.size === 0) return 0;
    return this.traffic.inboundSince([...phones], new Date(now.getTime() - WEEK_MS).toISOString());
  }
}
