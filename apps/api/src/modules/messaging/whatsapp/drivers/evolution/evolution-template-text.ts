import { templateButtons } from '@/modules/messaging/whatsapp/messages/wa-json';
import { bodyValues, buttonValues } from '@/modules/messaging/whatsapp/messages/wa-components';
import type { TemplateSend } from '@/modules/messaging/whatsapp/whatsapp.types';

// A Baileys instance has no templates (docs/19 «Evolution driver»): a registry row goes as plain
// text, its Arabic body with the params filled in, the footer, and each button as a text line (a
// link button shows its full link; a quick reply shows its words for the family to type). Pure.

/** {{n}} → the n-th value; a value is never re-scanned (no placeholder inside a value expands). */
function filled(body: string, values: readonly string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (all, n: string) => values[Number(n) - 1] ?? all);
}

/** The button lines: «text: link» for a link, «• text» for a quick reply. */
function buttonLines(input: TemplateSend): string[] {
  const suffix = new Map(buttonValues(input).map((b) => [b.index, b.value]));
  return templateButtons(input.template.buttons).map((b, i) => {
    if (b.type === 'quick_reply') return `• ${b.text}`;
    const link = b.url.replace('{{1}}', suffix.get(i) ?? '');
    return b.text ? `${b.text}: ${link}` : link;
  });
}

/**
 * The text a template send becomes on a Baileys number. The row's own checks run (a missing
 * value refuses the send as Meta's 132000 would), so a bad row fails the same on every driver.
 */
export function templateAsText(input: TemplateSend): string {
  const body = filled(input.template.body_ar, bodyValues(input.template, input.params));
  const footer = input.template.footer_ar?.trim() ? [input.template.footer_ar.trim()] : [];
  const buttons = buttonLines(input);
  const tail = [...footer, ...buttons];
  return tail.length ? `${body}\n\n${tail.join('\n')}` : body;
}
