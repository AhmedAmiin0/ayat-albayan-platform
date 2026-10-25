import { isTimedKey, NOTIFICATION_CHANNELS, type NotificationChannel, type NotificationRuleView, type RulePatchInput } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { channelWords, fillText, timingText } from './rule-text';
import { parseTiming, sameTiming, timingDraft, type TimingDraft } from './rule-timing';

// One row's unsaved choices (everything but the switch, which saves on its own) and the PATCH body
// that carries only what changed (docs/23b §4).

export interface RuleDraft {
  channels: NotificationChannel[];
  timing: TimingDraft | null;
  number_id: string | null;
}

export type DraftResult =
  | { ok: true; patch: Omit<RulePatchInput, 'enabled' | 'confirmText'>; changes: string[] }
  | { ok: false; error: string };

/** The draft that matches the stored row. */
export function draftOf(rule: NotificationRuleView): RuleDraft {
  return {
    channels: [...rule.channels],
    timing: isTimedKey(rule.key) ? timingDraft(rule.key, rule.timing) : null,
    number_id: rule.number_id,
  };
}

const ordered = (xs: readonly NotificationChannel[]): NotificationChannel[] => NOTIFICATION_CHANNELS.filter((ch) => xs.includes(ch));
const sameChannels = (a: readonly NotificationChannel[], b: readonly NotificationChannel[]): boolean =>
  ordered(a).join() === ordered(b).join();

export interface DraftInput {
  rule: NotificationRuleView;
  draft: RuleDraft;
  /** The number's name for the «لم يُحفظ» line (null = the template's number). */
  numberName: (id: string | null) => string;
}

/** The changed fields as a PATCH body and in words («قبل الحلقة بـ45 دقيقة بدلًا من 60…»), or the first problem. */
export function draftResult({ rule, draft, numberName }: DraftInput): DraftResult {
  const r = t.notificationRules;
  const patch: Omit<RulePatchInput, 'enabled' | 'confirmText'> = {};
  const changes: string[] = [];
  const instead = (now: string, was: string) => fillText(r.insteadOf, { new: now, old: was });
  if (draft.timing) {
    const parsed = parseTiming(draft.timing);
    if (!parsed.ok) return parsed;
    if (!sameTiming(parsed.value, rule.timing)) {
      patch.timing = parsed.value;
      changes.push(instead(timingText(rule.key, parsed.value) ?? '', timingText(rule.key, rule.timing) ?? r.timing.sameAsFamily));
    }
  }
  if (!sameChannels(draft.channels, rule.channels)) {
    patch.channels = ordered(draft.channels);
    changes.push(instead(channelWords(draft.channels), channelWords(rule.channels)));
  }
  if (draft.number_id !== rule.number_id) {
    patch.number_id = draft.number_id;
    changes.push(instead(numberName(draft.number_id), numberName(rule.number_id)));
  }
  return { ok: true, patch, changes };
}

/** Is anything left to save (a change, or an edit that does not parse yet)? */
export const isDirty = (result: DraftResult): boolean => !result.ok || result.changes.length > 0;
