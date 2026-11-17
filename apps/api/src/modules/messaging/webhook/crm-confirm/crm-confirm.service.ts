import { Inject, Injectable, Logger } from '@nestjs/common';
import { attachPatch } from '@/modules/messaging/webhook/external/manual-echo';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { crmLookup, type CrmLookup, type CrmMessage } from '@/modules/messaging/whatsapp';
import { deliveryOf, LookupNotes, tail, wamids } from './crm-confirm.notes';
import { CrmConfirmRepo } from './crm-confirm.repo';
import { READ_BACK_MS, matchUncertain, type MatchResult, type UncertainRow } from './crm-match';
import { CRM_CONFIRM_SOURCE, sentViaCrm, type CrmConfirmSource } from './crm-places';

// A crm send that timed out (error_code uncertain) is confirmed from the CRM, never guessed and
// never resent (docs/19 «Confirming an uncertain send», incident 2026-11-15). The lookups never
// pause the line: a refused key is logged once per scope, anything else skips; nothing is ever
// marked failed.

/** The crm rows still uncertain, and the lookups over their CRM. */
export interface Pending {
  rows: UncertainRow[];
  lookup: CrmLookup;
}

/** Which row a CRM message is: matchUncertain over one read of held wamids and template names. */
type Matcher = (item: CrmMessage, phone: string | null | undefined) => MatchResult;

/** One row and the CRM messages it may be (one conversation, or every one of its contact). */
interface RowInput {
  row: UncertainRow;
  items: readonly CrmMessage[];
  phone: string | null | undefined;
  event?: StatusEvent;
}

/** Uncertain rows read at most (every driver); a full read is not trusted: nothing is confirmed. */
const READ_ROWS = 500;

@Injectable()
export class CrmConfirm {
  private readonly log = new Logger(CrmConfirm.name);
  private readonly notes = new LookupNotes(this.log);

  constructor(
    @Inject(CrmConfirmRepo) private readonly repo: CrmConfirmRepo,
    @Inject(CRM_CONFIRM_SOURCE) private readonly source: CrmConfirmSource,
  ) {}

  /**
   * A /webhooks/wacrm status for a wamid no row holds. Only when a crm row is uncertain (the normal
   * case, a message staff sent from the CRM's dashboard, makes no CRM call). True = a row holds it.
   */
  async adopt(e: StatusEvent): Promise<boolean> {
    const conversationId = e.crm?.conversationId;
    // A failed status never attaches (attachPatch): no lookup for it.
    if (!conversationId || e.status === 'failed') return false;
    return this.guarded(async () => {
      const p = await this.pending(new Date());
      const items = p ? await p.lookup.messages(conversationId) : [];
      const item = items.find((i) => i.whatsapp_message_id === e.waMessageId);
      if (!p || !item) return false;
      const phone = (await p.lookup.conversation(conversationId)).contact?.phone;
      const m = await this.matcher(p.rows, wamids(items));
      const match = m(item, phone);
      if (!match.row) return this.write(match, { item });
      return this.sole(m, { row: match.row, items, phone, event: e });
    }, false);
  }

  /** null = nothing on crm, no crm row uncertain, or too many to trust a match (no CRM call). */
  async pending(now: Date): Promise<Pending | null> {
    const places = this.source.places();
    if (!places.env) return null;
    const since = new Date(now.getTime() - READ_BACK_MS);
    const read = await this.repo.uncertain({ since, until: now, limit: READ_ROWS });
    const full = read.length >= READ_ROWS;
    if (full) this.log.warn('crm confirm: too many uncertain rows, none confirmed');
    const rows = full ? [] : read.filter(sentViaCrm(places));
    return rows.length > 0 ? { rows, lookup: crmLookup(places.env, this.source.fetch) } : null;
  }

  /** The row's ONE CRM message: a second look-alike message leaves it as it is. */
  async confirmRow(input: RowInput, rows: readonly UncertainRow[]): Promise<boolean> {
    return this.sole(await this.matcher(rows, wamids(input.items)), input);
  }

  private sole(m: Matcher, input: RowInput): Promise<boolean> {
    const { row, items, phone, event } = input;
    const hits = items.filter((i) => m(i, phone).row?.id === row.id);
    const [item] = hits;
    if (!item) return Promise.resolve(false);
    const only = hits.length === 1 ? row : null;
    return this.write({ row: only, count: hits.length }, event ? { item, event } : { item });
  }

  private async matcher(rows: readonly UncertainRow[], ids: readonly string[]): Promise<Matcher> {
    const keys = rows.flatMap((r) => r.template_key ?? []);
    const [held, names] = await Promise.all([this.repo.held(ids), this.repo.templateNames(keys)]);
    return (item, phone) =>
      matchUncertain(rows, { item, phone, held: held.has(item.whatsapp_message_id ?? '') }, names);
  }

  /**
   * The one compare-and-set; 0 or 2+ candidates leave every row as it is (counts logged only).
   * Lost to a concurrent status of the same wamid: true when a row holds it now (it moves on).
   */
  private async write(match: MatchResult, found: { item: CrmMessage; event?: StatusEvent }) {
    const { item, event } = found;
    const wamid = item.whatsapp_message_id ?? '';
    const patch = attachPatch({ at: item.created_at, status: deliveryOf(item.status) }, event);
    const row = patch ? match.row : null;
    if (!row || !patch) {
      this.log.log(`crm confirm ${tail(wamid)}: ${String(match.count)} candidate(s), left as is`);
      return false;
    }
    const done = await this.repo.attach({ row, waMessageId: wamid, patch });
    this.noteAttach({ done, row, wamid });
    return done || (await this.repo.held([wamid])).has(wamid);
  }

  private noteAttach(at: { done: boolean; row: UncertainRow; wamid: string }): void {
    const outcome = at.done ? 'confirmed sent' : 'moved meanwhile';
    const who = `${tail(at.row.id)} (${tail(at.row.phone_e164)})`;
    this.log.log(`crm confirm ${tail(at.wamid)} → ${who}: ${outcome}`);
  }

  /** Never throws: a lookup or database failure is logged and the work stops (retried later). */
  async guarded<T>(work: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await work();
    } catch (e) {
      this.notes.report(e);
      return fallback;
    }
  }
}
