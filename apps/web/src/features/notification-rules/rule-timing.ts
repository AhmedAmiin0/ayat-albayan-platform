import { DAY_BEFORE_HOURS, westernDigits, type AnyRuleTiming, type TimedNotificationKey } from '@ab/shared';
import { t } from '@/lib/i18n';

// A row's timing as the editor holds it (strings, so a half-typed number stays on screen), and the
// way back to the contract's timing (RULE_TIMING_SCHEMAS bounds, checked here with words in MSA).

export type TimingDraft =
  | { kind: 'lesson_reminder'; minutes: string }
  | { kind: 'lesson_reminder_24h'; at: string }
  | { kind: 'teacher_lesson_reminder'; minutes: string; same: boolean }
  | { kind: 'follow_up_slots'; hours: string[]; from: string; to: string };

export type TimingResult = { ok: true; value: AnyRuleTiming } | { ok: false; error: string };

/** The hour list a follow-up row may hold (docs/26b §6a 1.15: ascending, ≤ 5). */
export const MAX_FOLLOW_UPS = 5;

const num = (v: unknown, fallback: number): string => (typeof v === 'number' ? String(v) : String(fallback));
const field = (timing: AnyRuleTiming | null, name: string): unknown =>
  timing && typeof timing === 'object' ? (timing as Record<string, unknown>)[name] : undefined;

/** The editor's copy of a stored timing (null timing = the contract's defaults). */
export function timingDraft(key: TimedNotificationKey, timing: AnyRuleTiming | null): TimingDraft {
  switch (key) {
    case 'lesson_reminder':
      return { kind: key, minutes: num(field(timing, 'minutes_before'), 60) };
    case 'lesson_reminder_24h': {
      const at = field(timing, 'send_at_local');
      return { kind: key, at: typeof at === 'string' ? at : '' };
    }
    case 'teacher_lesson_reminder': {
      const minutes = field(timing, 'minutes_before');
      return { kind: key, minutes: num(minutes, 60), same: typeof minutes !== 'number' };
    }
    case 'follow_up_slots': {
      const hours = field(timing, 'hours');
      const list = Array.isArray(hours) ? hours.map((h) => String(h)) : ['24', '72'];
      return { kind: key, hours: list, from: num(field(timing, 'slots_from_hours'), 12), to: num(field(timing, 'slots_to_days'), 7) };
    }
  }
}

/** A whole number within [min, max] typed on any keypad («٤٥» is 45), or null. */
export function boundedInt(text: string, bounds: { min: number; max: number }): number | null {
  const s = westernDigits(text.trim());
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= bounds.min && n <= bounds.max ? n : null;
}

const e = () => t.notificationRules.errors;
const MINUTES = { min: 5, max: 720 };

function followUp(d: Extract<TimingDraft, { kind: 'follow_up_slots' }>): TimingResult {
  const hours = d.hours.map((h) => boundedInt(h, { min: 1, max: 720 }));
  if (hours.length === 0 || hours.length > MAX_FOLLOW_UPS || hours.some((h) => h === null)) return { ok: false, error: e().hours };
  const list = hours.filter((h): h is number => h !== null);
  if (list.some((h, i) => i > 0 && h <= (list[i - 1] ?? 0))) return { ok: false, error: e().ascending };
  const from = boundedInt(d.from, { min: 1, max: 168 });
  if (from === null) return { ok: false, error: e().slotsFrom };
  const to = boundedInt(d.to, { min: 1, max: 30 });
  if (to === null) return { ok: false, error: e().slotsTo };
  return { ok: true, value: { hours: list, slots_from_hours: from, slots_to_days: to } };
}

/** The draft as the contract's timing, or the first problem in words. */
export function parseTiming(d: TimingDraft): TimingResult {
  switch (d.kind) {
    case 'lesson_reminder': {
      const minutes = boundedInt(d.minutes, MINUTES);
      return minutes === null ? { ok: false, error: e().minutes } : { ok: true, value: { minutes_before: minutes } };
    }
    case 'lesson_reminder_24h': {
      const at = DAY_BEFORE_HOURS.find((h) => h === d.at) ?? null;
      return { ok: true, value: { send_at_local: at } };
    }
    case 'teacher_lesson_reminder': {
      if (d.same) return { ok: true, value: { minutes_before: null } };
      const minutes = boundedInt(d.minutes, MINUTES);
      return minutes === null ? { ok: false, error: e().minutes } : { ok: true, value: { minutes_before: minutes } };
    }
    case 'follow_up_slots':
      return followUp(d);
  }
}

/** Key-order independent equality of two timings (the server may send the keys in any order). */
export function sameTiming(a: unknown, b: unknown): boolean {
  const canon = (v: unknown): string =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${k}:${canon((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v ?? null);
  return canon(a) === canon(b);
}
