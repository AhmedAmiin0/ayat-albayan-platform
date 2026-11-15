import type { AuthorTemplate } from '@ab/client-core';
import {
  QUICK_REPLY_INTENTS, type QuickReplyIntent, type TemplateDisplayButton,
} from '@ab/shared';
import { varsOf, type DraftVar } from '@/features/messaging/templates/create/template-draft';
import { t } from '@/lib/i18n/i18n';

// «تعديل» (owner 2026-11-14): the form's state as typed, prefilled from the row. The buttons are
// what WhatsApp shows (display), else the registry's; a quick reply keeps its action by index.

export type EditButton =
  | { type: 'url'; text: string; url: string }
  | { type: 'quick_reply'; text: string; intent: QuickReplyIntent | '' };

export interface EditDraft {
  body: string;
  footer: string;
  vars: DraftVar[];
  buttons: EditButton[];
}

const SAMPLES: Record<string, string | undefined> = t.templates.reviewSamples;

const intentAt = (tpl: AuthorTemplate, i: number): QuickReplyIntent | '' => {
  const b = tpl.buttons[i];
  return b?.type === 'quick_reply' ? b.intent : '';
};

type ToRow = (b: TemplateDisplayButton, tpl: AuthorTemplate, i: number) => EditButton;

const SHOWN: Partial<Record<string, ToRow>> = {
  url: (b) => ({ type: 'url', text: b.text, url: b.url ?? '' }),
  quick_reply: (b, tpl, i) => ({ type: 'quick_reply', text: b.text, intent: intentAt(tpl, i) }),
};

/** What WhatsApp shows under the bubble today, as rows of the form. */
function buttonsOf(tpl: AuthorTemplate): EditButton[] {
  const shown = tpl.display?.buttons.length ? tpl.display.buttons : null;
  const own: TemplateDisplayButton[] = tpl.buttons.map((b) =>
    b.type === 'url' ? { type: 'url', text: b.text ?? '', url: b.url } : { type: b.type, text: b.text });
  return (shown ?? own).flatMap((b, i) => SHOWN[b.type]?.(b, tpl, i) ?? []);
}

/** The row as the form opens it: its words, its variables' names, its buttons. */
export function draftOf(tpl: AuthorTemplate): EditDraft {
  const vars = tpl.params.map((name) => ({ name, sample: SAMPLES[name] ?? '' }));
  return { body: tpl.body_ar, footer: tpl.footer_ar ?? '', vars, buttons: buttonsOf(tpl) };
}

const asIntent = (v: string): QuickReplyIntent | undefined =>
  QUICK_REPLY_INTENTS.find((i) => i === v);

/** The PATCH body; templateEditSchema checks it before it leaves the form. */
export function toEditInput(draft: EditDraft) {
  const params = varsOf(draft).map((v, i) => ({ name: v.name || `var_${String(i + 1)}`, sample: v.sample }));
  const buttons = draft.buttons.map((b) =>
    b.type === 'url' ? b : { type: b.type, text: b.text, intent: asIntent(b.intent) });
  return { body: draft.body, footer: draft.footer, params, buttons };
}
