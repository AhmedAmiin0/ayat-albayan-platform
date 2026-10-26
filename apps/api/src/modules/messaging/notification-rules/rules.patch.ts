import {
  ESSENTIAL_OFF_TEXT,
  isTimedKey,
  legacyValues,
  RULE_TIMING_SCHEMAS,
  resolveRule,
  type AnyRuleTiming,
  type EffectiveRule,
  type NotificationChannel,
  type NotificationEntry,
  type NotificationKey,
  type RulePatchInput,
  type RuleSettings,
} from '@ab/shared';
import { ruleConfirmationRequired, ruleError } from './rules.errors';
import type { RulesSnapshot } from './store/rules.reader';
import type { RuleRowWrite } from './store/rules.table';

interface PlanInput {
  entry: NotificationEntry<NotificationKey>;
  snapshot: RulesSnapshot;
  patch: RulePatchInput;
}

export interface PatchPlan {
  /** The row to upsert: the patch over the current effective rule. */
  row: RuleRowWrite;
  before: EffectiveRule;
  after: EffectiveRule;
  /** legacy mode: the mirrored legacy keys to write with the row (parity stays empty); {} in module mode. */
  legacy: Partial<RuleSettings>;
  /** An essential row going ON → OFF (confirmed): logged in the activity log too. */
  essentialOff: boolean;
}

/** A subset of the entry's channels that keeps its first one, in the entry's order; else 422 invalid. */
function channelsOf(entry: NotificationEntry, wanted: readonly NotificationChannel[]): NotificationChannel[] {
  const first = entry.channels[0];
  if (!wanted.every((c) => entry.channels.includes(c)) || (first !== undefined && !wanted.includes(first))) {
    throw ruleError('invalid', 'channels');
  }
  return entry.channels.filter((c) => wanted.includes(c));
}

/** Timed keys: the key's own schema (null = the default). Other keys take no timing. */
function timingOf(key: string, wanted: unknown): AnyRuleTiming | null {
  if (wanted === null) return null;
  if (!isTimedKey(key)) throw ruleError('invalid', 'timing');
  const parsed = RULE_TIMING_SCHEMAS[key].safeParse(wanted);
  if (!parsed.success) throw ruleError('invalid', 'timing');
  return parsed.data as AnyRuleTiming;
}

/** A number only routes a WhatsApp row (its existence is checked by the writer). */
function numberOf(entry: NotificationEntry, wanted: string | null): string | null {
  if (wanted !== null && !entry.channels.includes('whatsapp')) throw ruleError('invalid', 'number_id');
  return wanted;
}

/** The patch over the current effective rule (each given field checked against the entry). */
function nextRow(input: { entry: NotificationEntry<NotificationKey>; before: EffectiveRule; patch: RulePatchInput }): RuleRowWrite {
  const { entry, before, patch } = input;
  return {
    key: entry.key,
    enabled: patch.enabled ?? before.enabled,
    channels: patch.channels === undefined ? before.channels : channelsOf(entry, patch.channels),
    timing: patch.timing === undefined ? before.timing : timingOf(entry.key, patch.timing),
    number_id: patch.number_id === undefined ? before.number_id : numberOf(entry, patch.number_id),
  };
}

const confirmed = (text: unknown): boolean => typeof text === 'string' && text.trim() === ESSENTIAL_OFF_TEXT;

/**
 * PATCH /admin/notifications/:key, decided without I/O (docs/23b decision 4): manual rows 422
 * not_editable; a locked row's OFF 422 locked; channels / timing / number checked against the entry;
 * an essential row's OFF needs ESSENTIAL_OFF_TEXT (428). Unspecified fields keep the current effective
 * values. In legacy mode the mirrored legacy keys are written too, so both paths keep agreeing.
 */
export function planPatch(input: PlanInput): PatchPlan {
  const { entry, snapshot, patch } = input;
  if (entry.manual) throw ruleError('not_editable');
  if (entry.locked && patch.enabled === false) throw ruleError('locked');
  const before = resolveRule(entry, { mode: snapshot.mode, row: snapshot.rows.get(entry.key) ?? null, settings: snapshot.settings });
  const row = nextRow({ entry, before, patch });
  const essentialOff = entry.essential && before.enabled && !row.enabled;
  if (essentialOff && !confirmed(patch.confirmText)) throw ruleConfirmationRequired();
  const timing = row.timing as AnyRuleTiming | null;
  const legacy = snapshot.mode === 'legacy' ? legacyValues(entry.key, { enabled: row.enabled, timing }) : {};
  const after = resolveRule(entry, { mode: snapshot.mode, row, settings: { ...snapshot.settings, ...legacy } });
  return { row, before, after, legacy, essentialOff };
}
