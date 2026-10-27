import type { ReplySlot } from '@ab/shared';
import type { KeyboardTypeOptions } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';

/** Blanks typed as digits («[المبلغ]», «[الرقم]») or as a link («[الرابط]»); dates and times stay plain text. */
const NUMERIC = new Set(['المبلغ', 'الرقم', 'amount', 'number']);
const URL = new Set(['الرابط', 'link', 'url']);

/** The keyboard for a slot's input, by its label. Pure. */
export function slotKeyboard(slot: ReplySlot): KeyboardTypeOptions {
  if (slot.kind === 'auto') return 'default';
  const label = slot.label.toLowerCase();
  if (NUMERIC.has(label)) return 'numeric';
  return URL.has(label) ? 'url' : 'default';
}

/** A slot's input label: the blank's own words, «قيمة n» for an empty «[ ]», the placeholder's name. */
export function slotLabel(slot: ReplySlot): string {
  if (slot.kind === 'auto') return t.savedReplies.placeholders[slot.key];
  return slot.label || t.savedReplies.fill.blank.replace('{n}', String(slot.n ?? 1));
}
