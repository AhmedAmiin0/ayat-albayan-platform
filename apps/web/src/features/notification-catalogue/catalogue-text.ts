import type { Glyph, LineHealthView, NotificationEntryView, Tone, WaLine } from '@ab/shared';
import { t } from '@/lib/i18n';

const c = () => t.notificationCatalogue;

/** The state chip: «يُرسل» ok / «لا يُرسل» neutral (struck) / «يدوي» neutral (hollow). */
export function stateChip(entry: Pick<NotificationEntryView, 'state'>): { tone: Tone; glyph: Glyph; label: string } {
  if (entry.state === 'on') return { tone: 'ok', glyph: 'fill', label: c().states.on };
  if (entry.state === 'manual') return { tone: 'neutral', glyph: 'hollow', label: c().states.manual };
  return { tone: 'neutral', glyph: 'struck', label: c().states.off };
}

/** The first blocker in words («لأن إرسال الرسائل متوقف»), or null. */
export function blockerText(entry: Pick<NotificationEntryView, 'blocker'>): string | null {
  return entry.blocker ? c().blockers[entry.blocker] : null;
}

/** When: the trigger in words, then the timing setting's value («قبل الحلقة بـ60 دقيقة»). */
export function whenText(entry: Pick<NotificationEntryView, 'key' | 'timing'>): string {
  const trigger = c().entries[entry.key].trigger;
  if (!entry.timing) return trigger;
  return `${trigger} · ${c().timing[entry.timing.key].replace('{value}', entry.timing.value)}`;
}

/** Channels joined in words: «جرس المنصة، إشعار الجوال والمتصفح». */
export const channelsText = (entry: Pick<NotificationEntryView, 'channels'>): string =>
  entry.channels.map((ch) => c().channels[ch]).join(t.common.listSeparator);

/** The tags beside the name: automatic, essential, locked. */
export function tagsOf(entry: Pick<NotificationEntryView, 'automatic' | 'essential' | 'locked'>): string[] {
  const tags = c().tags;
  return [entry.automatic && tags.automatic, entry.essential && tags.essential, entry.locked && tags.locked].filter(
    (x): x is string => typeof x === 'string',
  );
}

/** One sending number: its role in words and, when a check kept it, the phone (E.164). */
export interface NumberPart {
  label: string;
  phone: string | null;
}

/**
 * Which numbers a row leaves from: its templates' lines with the kept phones; free-text WhatsApp
 * rows reply from the chat's number; bell / push rows have none («لا ينطبق»).
 */
export function numberParts(entry: Pick<NotificationEntryView, 'lines' | 'channels'>, lines: readonly LineHealthView[]): NumberPart[] {
  if (!entry.channels.includes('whatsapp')) return [{ label: c().noNumber, phone: null }];
  if (entry.lines.length === 0) return [{ label: c().chatNumber, phone: null }];
  return entry.lines.map((line: WaLine) => ({
    label: c().lines[line],
    phone: lines.find((l) => l.line === line)?.display_phone_e164 ?? null,
  }));
}
