import type {
  TemplateButton, TemplateDisplay, TemplateDisplayButton, TemplateEditButton,
} from '@ab/shared';
import { templateButtons, templateDisplay } from '@/modules/messaging/whatsapp/messages/wa-json';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// The buttons of an edit (owner 2026-11-14): what WhatsApp shows before (display, else the
// registry's), and the registry's after (the sender reads its intents and link suffixes by index).

/** Buttons the platform cannot write back (a call or a copy-code one). */
const FOREIGN: ReadonlySet<string> = new Set(['phone_number', 'copy_code']);

const urlOf = (b: TemplateButton): { url?: string } => (b.type === 'url' ? { url: b.url } : {});

/** What WhatsApp shows today: Meta's synced display, else the registry's own buttons. */
export function shownButtons(row: TemplateRow): TemplateDisplayButton[] {
  const shown = templateDisplay(row.display)?.buttons ?? [];
  if (shown.length) return shown;
  return templateButtons(row.buttons).map((b) => ({ type: b.type, text: b.text ?? '', ...urlOf(b) }));
}

export const hasForeignButtons = (row: TemplateRow): boolean =>
  shownButtons(row).some((b) => FOREIGN.has(b.type));

/** The edit's buttons as WhatsApp will draw them (display.buttons). */
const displayOf = (buttons: readonly TemplateEditButton[]): TemplateDisplayButton[] =>
  buttons.map((b) => ({ type: b.type, text: b.text, ...(b.type === 'url' ? { url: b.url } : {}) }));

/** A code-bound template keeps its registry buttons (intents, links); only the words change. */
export const reworded = (
  row: TemplateRow,
  after: readonly TemplateEditButton[],
): TemplateButton[] =>
  templateButtons(row.buttons).map((b, i) => renamed(b, after[i]?.text));

const renamed = (b: TemplateButton, text: string | undefined): TemplateButton =>
  b.type === 'url' ? { ...b, text: text ?? b.text } : { ...b, text: text ?? b.text };

const intentOf = (b: TemplateEditButton, before: TemplateButton | undefined) =>
  b.type === 'quick_reply' ? (b.intent ?? (before?.type === 'quick_reply' ? before.intent : undefined)) : null;

const dynamicUrl = (b: TemplateEditButton): boolean => b.type === 'url' && b.url.includes('{{1}}');

/**
 * The registry's buttons after the edit: every button when each quick reply has an intent (its
 * own, else the one at its index before); else none (plain replies, as an imported template), and
 * null when a link button then loses the suffix the sender fills (reply_intent_required).
 */
export function registryAfter(
  row: TemplateRow,
  after: readonly TemplateEditButton[],
): TemplateButton[] | null {
  const before = templateButtons(row.buttons);
  const out = after.map((b, i): TemplateButton | null => {
    const intent = intentOf(b, before[i]);
    if (b.type === 'url') return { type: 'url', url: b.url, text: b.text, example: b.example };
    return intent ? { type: 'quick_reply', text: b.text, intent } : null;
  });
  const full = out.filter((b): b is TemplateButton => b !== null);
  if (full.length === after.length) return full;
  const someIntent = full.some((b) => b.type === 'quick_reply');
  return someIntent || after.some(dynamicUrl) ? null : [];
}

/** display after the edit: the header unchanged, the new buttons. */
export const displayAfter = (
  row: TemplateRow,
  after: readonly TemplateEditButton[],
): TemplateDisplay => ({
  header: templateDisplay(row.display)?.header ?? null,
  buttons: displayOf(after),
});
