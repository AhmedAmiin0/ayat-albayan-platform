import { draftParams, type AuthorTemplate } from '@ab/client-core';
import {
  templateAuthorSchema, templateEditSchema, type AuthorCategory, type TemplateDisplayButton,
  type TemplateEditButton, type TemplateView,
} from '@ab/shared';

// The template form (owner 2026-11-14), pure: what the fields hold, what each route takes (parsed
// by the shared zod schemas), and the preview's template.

export interface Draft {
  body: string;
  footer: string;
  /** {{1}}, {{2}}…'s samples for Meta's reviewer, in order. */
  samples: string[];
  buttons: TemplateEditButton[];
}

export const EMPTY_DRAFT: Draft = { body: '', footer: '', samples: [], buttons: [] };

type Shown = TemplateDisplayButton;
type Registry = AuthorTemplate['buttons'][number] | undefined;

/** A shown button as an edit carries it: a link keeps its url, a reply its intent. */
const AS_EDIT: Partial<Record<Shown['type'], (b: Shown, reg: Registry) => TemplateEditButton[]>> = {
  url: (b, reg) => {
    const url = b.url ?? (reg?.type === 'url' ? reg.url : undefined);
    return url ? [{ type: 'url', text: b.text, url }] : [];
  },
  quick_reply: (b, reg) => [
    { type: 'quick_reply', text: b.text, ...(reg?.type === 'quick_reply' ? { intent: reg.intent } : {}) },
  ],
};

const fromRegistry = (b: AuthorTemplate['buttons'][number]): Shown =>
  (b.type === 'url' ? { type: 'url', text: b.text ?? '', url: b.url } : { type: b.type, text: b.text });

/** What WhatsApp shows (display), else the registry's buttons, as edit buttons. */
export function editButtonsOf(tpl: AuthorTemplate): TemplateEditButton[] {
  const display = tpl.display?.buttons ?? [];
  const shown = display.length ? display : tpl.buttons.map(fromRegistry);
  return shown.flatMap((b, i) => AS_EDIT[b.type]?.(b, tpl.buttons[i]) ?? []);
}

/** The edit form's start: the template's words, its variable names as samples. */
export const draftOf = (tpl: AuthorTemplate): Draft => ({
  body: tpl.body_ar,
  footer: tpl.footer_ar ?? '',
  samples: [...tpl.params],
  buttons: editButtonsOf(tpl),
});

/** PATCH …/content or …/authored/:key; the variable names kept where the template had them. */
export const editPayload = (d: Draft, names: readonly string[]) =>
  templateEditSchema.safeParse({
    body: d.body,
    footer: d.footer,
    params: draftParams(d.body, d.samples, names),
    buttons: d.buttons,
  });

/** POST …/authored: quick replies only, a blank name for the API to choose. */
export const authorPayload = (d: Draft, meta: { key: string; category: AuthorCategory }) =>
  templateAuthorSchema.safeParse({
    ...meta,
    body: d.body,
    footer: d.footer,
    params: draftParams(d.body, d.samples),
    buttons: d.buttons.map((b) => ({ type: 'quick_reply', text: b.text })),
  });

const NEW: Pick<AuthorTemplate, 'key' | 'meta_name' | 'category' | 'header_format' | 'line' | 'display'> = {
  key: 'draft', meta_name: '', category: 'utility', header_format: null, line: 'chat', display: null,
};

const shownOf = (b: TemplateEditButton): Shown =>
  (b.type === 'url' ? { type: 'url', text: b.text, url: b.url } : { type: b.type, text: b.text });

/** The template the live preview draws: the draft's words over the template's header. */
export function previewView(d: Draft, src: AuthorTemplate | null): TemplateView {
  const from = src ?? NEW;
  return {
    key: from.key, meta_name: from.meta_name, language: 'ar', category: from.category,
    header_format: from.header_format, body_ar: d.body, footer_ar: d.footer.trim() || null,
    params: [], buttons: [],
    display: { header: from.display?.header ?? null, buttons: d.buttons.map(shownOf) },
    status: 'not_submitted', quality: null, meta_id: null, last_checked_at: null, last_error: null,
    submitted_at: null, line: from.line, sales_starter: true,
  };
}
