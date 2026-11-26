import { shortLinkOutcomeSchema, type ShortLinkOutcome } from '@ab/shared';
import { z } from 'zod';
import { own } from '@/common/infra/own-value';

/** What the gate knows about one visitor of one managed link (docs/19 «Decision table»). */
export interface GateFacts {
  /** Active and before its expiry. */
  live: boolean;
  /** audience 'listed': only the link's users may open it. */
  listed: boolean;
  /** The visitor is one of the link's users (by profile, by phone, or a listed profile's phone). */
  inList: boolean;
  /** max_users distinct visitors already opened it. */
  full: boolean;
  /** The visitor opened it before (always passes the limit). */
  returning: boolean;
}

/** The decision table: the first matching row wins; none = open (record the visit, the target). */
export const GATE_RULES: readonly (readonly [ShortLinkOutcome, (f: GateFacts) => boolean])[] = [
  ['gone', (f) => !f.live],
  ['not_allowed', (f) => f.listed && !f.inList],
  ['limit_reached', (f) => f.full && !f.returning],
];

export const decide = (facts: GateFacts): ShortLinkOutcome =>
  GATE_RULES.find(([, hit]) => hit(facts))?.[0] ?? 'open';

/** short_link_record_visit's answer → the outcome (a race the read missed: gone or full). */
const RECORDED = z.record(z.string(), shortLinkOutcomeSchema).readonly().decode({
  recorded: 'open',
  limit_reached: 'limit_reached',
  gone: 'gone',
});
export const outcomeOfRecord = (answer: string): ShortLinkOutcome =>
  own(RECORDED, answer) ?? 'gone';
