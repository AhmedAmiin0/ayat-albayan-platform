import type { Glyph, LineHealthView, NotificationEntryView, Tone } from '@ab/shared';
import { t } from '@/lib/i18n';

// «ماذا يُرسل ومتى» in words on the phone (the web's catalogue-text, same ar.json keys).

const c = () => t.notificationCatalogue;

/** «يُرسل» ok / «لا يُرسل» neutral struck / «يدوي» neutral hollow. */
export function chipOf(entry: Pick<NotificationEntryView, 'state'>): { tone: Tone; glyph: Glyph; label: string } {
  if (entry.state === 'on') return { tone: 'ok', glyph: 'fill', label: c().states.on };
  if (entry.state === 'manual') return { tone: 'neutral', glyph: 'hollow', label: c().states.manual };
  return { tone: 'neutral', glyph: 'struck', label: c().states.off };
}

/** The trigger, then the timing with its value. */
export function whenOf(entry: Pick<NotificationEntryView, 'key' | 'timing'>): string {
  const trigger = c().entries[entry.key].trigger;
  return entry.timing ? `${trigger} · ${c().timing[entry.timing.key].replace('{value}', entry.timing.value)}` : trigger;
}

/** The sending numbers by role; free-text rows reply from the chat's number. */
const numbersOf = (lines: NotificationEntryView['lines']): string =>
  lines.length > 0 ? lines.map((l) => c().lines[l]).join(t.common.listSeparator) : c().chatNumber;

/** «ولي الأمر · واتساب · رقم الإشعارات» and, when held, the first blocker in words. */
export function factsOf(entry: NotificationEntryView): string {
  const channels = entry.channels.map((ch) => c().channels[ch]).join(t.common.listSeparator);
  const numbers = entry.channels.includes('whatsapp') ? numbersOf(entry.lines) : null;
  // A blocker this build has no words for (a newer API) shows no reason instead of «undefined».
  const blockers: Record<string, string | undefined> = c().blockers;
  const reason = entry.blocker && Object.hasOwn(blockers, entry.blocker) ? blockers[entry.blocker] : undefined;
  const parts = [c().audience[entry.audience], channels, numbers, reason];
  return parts.filter((p): p is string => typeof p === 'string' && p !== '').join(' · ');
}

/** «رقم الإشعارات: +966…» per kept line, or «لم يُفحص الرقم بعد». */
export function numberLine(line: LineHealthView['line'], kept: readonly LineHealthView[]): { label: string; phone: string | null } {
  return { label: c().lines[line], phone: kept.find((k) => k.line === line)?.display_phone_e164 ?? null };
}
