import { Inject, Injectable, Logger } from '@nestjs/common';
import { attachPatch } from '@/modules/messaging/webhook/external/manual-echo';
import {
  DELIVERY_STATUSES,
  type DeliveryStatus,
  type StatusEvent,
} from '@/modules/messaging/webhook/webhook.events';
import {
  crmLookup,
  CrmLookupError,
  type CrmLookup,
  type CrmMessage,
} from '@/modules/messaging/whatsapp';
import { CrmConfirmRepo, type UncertainSpan } from './crm-confirm.repo';
import { LOOKBACK_MS, matchUncertain, type MatchResult, type UncertainRow } from './crm-match';
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

const ADOPT_ROWS = 100;
const isDelivery = (s: string): s is DeliveryStatus =>
  (DELIVERY_STATUSES as readonly string[]).includes(s);
const deliveryOf = (s: string | null | undefined): DeliveryStatus | null =>
  s && isDelivery(s) ? s : null;
/** The tail of an id or phone for the log: never the whole value. */
const tail = (v: string): string => `…${v.slice(-4)}`;
const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 160);

@Injectable()
export class CrmConfirm {
  private readonly log = new Logger(CrmConfirm.name);
  /** Scopes already reported: once per process. */
  private readonly warned = new Set<string>();

  constructor(
    private readonly repo: CrmConfirmRepo,
    @Inject(CRM_CONFIRM_SOURCE) private readonly source: CrmConfirmSource,
  ) {}

  /**
   * A /webhooks/wacrm status for a wamid no row holds. Only when a crm row is uncertain (the normal
   * case, a message staff sent from the CRM's dashboard, makes no CRM call). True = a row holds it
   * now.
   */
  async adopt(e: StatusEvent): Promise<boolean> {
    const conversationId = e.crm?.conversationId;
    // A failed status never attaches (attachPatch): no lookup for it.
    if (!conversationId || e.status === 'failed') return false;
    const now = Date.now();
    const span = { since: new Date(now - LOOKBACK_MS), until: new Date(now), limit: ADOPT_ROWS };
    return this.guarded(async () => {
      const p = await this.pending(span);
      const item =
        p &&
        (await p.lookup.messages(conversationId)).find(
          (i) => i.whatsapp_message_id === e.waMessageId,
        );
      if (!p || !item) return false;
      const conversation = await p.lookup.conversation(conversationId);
      const match = (await this.matcher(p.rows, [e.waMessageId]))(
        item,
        conversation.contact?.phone,
      );
      return this.write(match, { item, event: e });
    }, false);
  }

  /** null = nothing on crm, or no crm row uncertain in the span (no CRM call then). */
  async pending(span: UncertainSpan): Promise<Pending | null> {
    const places = this.source.places();
    if (!places.env) return null;
    const rows = (await this.repo.uncertain(span)).filter(sentViaCrm(places));
    return rows.length > 0 ? { rows, lookup: crmLookup(places.env, this.source.fetch) } : null;
  }

  async matcher(rows: readonly UncertainRow[], wamids: readonly string[]): Promise<Matcher> {
    const keys = rows.flatMap((r) => r.template_key ?? []);
    const [held, names] = await Promise.all([
      this.repo.held(wamids),
      this.repo.templateNames(keys),
    ]);
    return (item, phone) =>
      matchUncertain(rows, { item, phone, held: held.has(item.whatsapp_message_id ?? '') }, names);
  }

  /** The one compare-and-set; 0 or 2+ candidates leave every row as it is (counts logged only). */
  async write(
    match: MatchResult,
    found: { item: CrmMessage; event?: StatusEvent },
  ): Promise<boolean> {
    const { item, event } = found;
    const wamid = item.whatsapp_message_id ?? '';
    const patch = attachPatch({ at: item.created_at, status: deliveryOf(item.status) }, event);
    const row = patch ? match.row : null;
    if (!row || !patch) {
      this.log.log(
        `crm confirm ${tail(wamid)}: ${String(match.count)} candidate(s), left uncertain`,
      );
      return false;
    }
    const done = await this.repo.attach({ row, waMessageId: wamid, patch });
    const outcome = done ? 'confirmed sent' : 'moved meanwhile, left as is';
    this.log.log(
      `crm confirm ${tail(wamid)} → row ${tail(row.id)} (${tail(row.phone_e164)}): ${outcome}`,
    );
    return done;
  }

  /**
   * Never throws: a lookup or database failure is logged and the work stops (the sweep tries
   * again).
   */
  async guarded<T>(work: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await work();
    } catch (e) {
      this.report(e);
      return fallback;
    }
  }

  private report(e: unknown): void {
    const failure =
      e instanceof CrmLookupError ? e.failure : { kind: 'skip' as const, reason: reason(e) };
    const note =
      failure.kind === 'scope'
        ? this.scopeNote(failure.scope)
        : `crm confirm skipped: ${failure.reason}`;
    if (note) this.log.warn(note);
  }

  /** A missing scope is said once per process; then silence (the owner adds it in the CRM). */
  private scopeNote(scope: string): string | null {
    if (this.warned.has(scope)) return null;
    this.warned.add(scope);
    return `CRM key lacks ${scope}: uncertain sends are not confirmed`;
  }
}
