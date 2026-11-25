import type { LineHealthView, NotificationEntryView } from '@ab/shared';
import type { WaLine } from '@ab/catalog';
import type { Glyph, Tone } from '@ab/money';
import { t } from '@ab/web-kit';

const c = () => t.notificationCatalogue;

export function stateChip(entry: Pick<NotificationEntryView, 'state'>): { tone: Tone; glyph: Glyph; label: string } {
  if (entry.state === 'on') return { tone: 'ok', glyph: 'fill', label: c().states.on };
  if (entry.state === 'manual') return { tone: 'neutral', glyph: 'hollow', label: c().states.manual };
  return { tone: 'neutral', glyph: 'struck', label: c().states.off };
}

/** Null when nothing blocks; the v2 classroom_off text lives in notificationRules. */
export function blockerText(entry: Pick<NotificationEntryView, 'blocker'>): string | null {
  if (!entry.blocker) return null;
  return entry.blocker === 'classroom_off' ? t.notificationRules.blockers.classroom_off : c().blockers[entry.blocker];
}

export function whenText(entry: Pick<NotificationEntryView, 'key' | 'timing'>): string {
  const trigger = c().entries[entry.key].trigger;
  if (!entry.timing) return trigger;
  return `${trigger} · ${c().timing[entry.timing.key].replace('{value}', entry.timing.value)}`;
}

export const channelsText = (entry: Pick<NotificationEntryView, 'channels'>): string =>
  entry.channels.map((ch) => c().channels[ch]).join(t.common.listSeparator);

/** The tags beside the name: automatic, essential, locked. */
export function tagsOf(
  entry: Pick<NotificationEntryView, 'automatic' | 'essential' | 'locked'>,
): string[] {
  const tags = c().tags;
  return [
    entry.automatic && tags.automatic,
    entry.essential && tags.essential,
    entry.locked && tags.locked,
  ].filter((x): x is string => typeof x === 'string');
}

/** One sending number: its role in words and, when a check kept it, the phone (E.164). */
export interface NumberPart {
  label: string;
  phone: string | null;
}

/** Free-text WhatsApp rows reply from the chat's number; bell and push rows have none. */
export function numberParts(entry: Pick<NotificationEntryView, 'lines' | 'channels'>, lines: readonly LineHealthView[]): NumberPart[] {
  if (!entry.channels.includes('whatsapp')) return [{ label: c().noNumber, phone: null }];
  if (entry.lines.length === 0) return [{ label: c().chatNumber, phone: null }];
  return entry.lines.map((line: WaLine) => ({
    label: c().lines[line],
    phone: lines.find((l) => l.line === line)?.display_phone_e164 ?? null,
  }));
}
