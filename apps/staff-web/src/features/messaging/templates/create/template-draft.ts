import { BODY_SLOTS, type CREATE_REPLY_INTENTS, type WaLine } from '@ab/shared';

// «قالب جديد» (owner 2026-10-31): the form's state as typed, and the body it posts. The variables
// follow the body: one row per {{n}} it holds, kept by position while the text changes.

type ReplyIntent = (typeof CREATE_REPLY_INTENTS)[number];

export type DraftButton =
  | { type: 'url'; text: string; url: string }
  | { type: 'quick_reply'; text: string; intent: ReplyIntent };

/** One {{n}}: its name ('' = a value the sender types, posted as var_n) and its review sample. */
export interface DraftVar {
  name: string;
  sample: string;
}

export interface TemplateDraft {
  key: string;
  line: WaLine;
  category: 'utility' | 'marketing';
  language: string;
  header: string;
  body: string;
  footer: string;
  vars: DraftVar[];
  buttons: DraftButton[];
}

export const emptyDraft = (line: WaLine): TemplateDraft => ({
  key: '',
  line,
  category: 'utility',
  language: 'ar',
  header: '',
  body: '',
  footer: '',
  vars: [],
  buttons: [],
});

/** The highest {{n}} in the text, at most nine (the API refuses gaps and missing samples). */
export function varCount(body: string): number {
  const used = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return Math.min(BODY_SLOTS.length, Math.max(0, ...used));
}

/** The rows the text asks for: the typed ones by position, blank ones for new variables. */
export function varsOf(draft: Pick<TemplateDraft, 'body' | 'vars'>): DraftVar[] {
  return Array.from({ length: varCount(draft.body) }, (_, i) => draft.vars[i] ?? { name: '', sample: '' });
}

/** POST /messaging/templates' body; templateCreateSchema checks it before it leaves the form. */
export function toInput(draft: TemplateDraft) {
  const { key, line, category, language, header, body, footer, buttons } = draft;
  const params = varsOf(draft).map((v, i) => ({ name: v.name || `var_${String(i + 1)}`, sample: v.sample }));
  return { key, line, category, language, header, body, footer, params, buttons };
}

/** A new button row of `type`, its action «confirm» for a quick reply. */
export const newButton = (type: DraftButton['type']): DraftButton =>
  type === 'url' ? { type, text: '', url: 'https://' } : { type, text: '', intent: 'confirm' };
