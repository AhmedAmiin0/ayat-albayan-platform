import type { Tables } from '@ab/db';
import { foldText, waIdToE164 } from '@ab/shared';
import type { CrmMessage } from '@/modules/messaging/whatsapp';

// Which timed-out crm send (error_code uncertain) a message the CRM holds is (docs/19 «Confirming
// an uncertain send»). Pure: the webhook's adopt and the sweep both ask matchUncertain. Exactly one
// row or none: two look-alikes stay uncertain for staff, never a guess. Never a resend.

/** The sender's codes for «may have gone»: the crm driver's, and the script relay's. */
export const UNCERTAIN_CODES = ['uncertain', 'crm_uncertain'] as const;
/** The rows looked at: created at most this long ago. */
export const LOOKBACK_MS = 6 * 3_600_000;
const MINUTE = 60_000;
/** The row was created at most 10 min before the CRM wrote the message, at most 1 min after. */
const BEFORE_MS = 10 * MINUTE;
const AFTER_MS = MINUTE;

/** A failed crm row with no wamid, as the match reads it. */
export type UncertainRow = Pick<
  Tables<'messages'>,
  | 'id'
  | 'phone_e164'
  | 'body'
  | 'template_key'
  | 'created_at'
  | 'line'
  | 'number_id'
  | 'lead_id'
  | 'dedup_key'
>;

/** template key → every name the CRM may hold it by (crm-body.ts: crmTemplateName, meta_name). */
export type TemplateNames = ReadonlyMap<string, readonly string[]>;

/**
 * The CRM's message: its contact's phone as the CRM gives it, and whether a row holds its wamid.
 */
export interface CrmSent {
  item: CrmMessage;
  phone: string | null | undefined;
  held: boolean;
}

export interface MatchResult {
  row: UncertainRow | null;
  /** Rows that looked like it (0 or 2+ = left as they are). */
  count: number;
}

const NONE: MatchResult = { row: null, count: 0 };

const inWindow = (row: UncertainRow, at: Date): boolean => {
  const created = Date.parse(row.created_at);
  return created >= at.getTime() - BEFORE_MS && created <= at.getTime() + AFTER_MS;
};

const sameTemplate = (row: UncertainRow, item: CrmMessage, names: TemplateNames): boolean =>
  (names.get(row.template_key ?? '') ?? []).includes(item.template_name ?? '');

const sameText = (row: UncertainRow, item: CrmMessage): boolean => {
  const text = foldText(item.content_text ?? '');
  return text !== '' && foldText(row.body ?? '') === text;
};

/** A template row by its CRM name, a text row by its folded body. */
const SAME: Record<
  'template' | 'text',
  (r: UncertainRow, i: CrmMessage, n: TemplateNames) => boolean
> = {
  template: sameTemplate,
  text: (r, i) => sameText(r, i),
};

const kindOf = (row: UncertainRow): 'template' | 'text' => (row.template_key ? 'template' : 'text');

/** The CRM's outbound message with a wamid nobody holds yet. */
const adoptable = (sent: CrmSent): boolean =>
  sent.item.direction === 'outbound' && !!sent.item.whatsapp_message_id && !sent.held;

/**
 * The ONE row this CRM message is: same E.164 phone, created in its window, the same template or
 * text. `rows` are the crm rows still uncertain (the read checks the line, the wamid and the code).
 */
export function matchUncertain(
  rows: readonly UncertainRow[],
  sent: CrmSent,
  names: TemplateNames,
): MatchResult {
  const phone = waIdToE164(sent.phone ?? '');
  if (phone === null || !adoptable(sent)) return NONE;
  const { item } = sent;
  const same = (r: UncertainRow): boolean =>
    r.phone_e164 === phone && inWindow(r, item.created_at) && SAME[kindOf(r)](r, item, names);
  const hits = rows.filter(same);
  return { row: hits.length === 1 ? (hits[0] ?? null) : null, count: hits.length };
}
