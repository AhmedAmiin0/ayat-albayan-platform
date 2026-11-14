import { suggestedCategory, type AuthorCategory } from '@ab/shared';
import { varsOf, type DraftVar } from '@/features/messaging/templates/create/template-draft';
import type { EditButton } from '@/features/messaging/templates/edit/edit-draft';

// «قالب جديد» for sales (owner 2026-11-14): text, variables with samples, quick replies. Its
// category follows the text (MARKETING for an offer) until the author picks one.

export interface AuthorDraft {
  key: string;
  /** null = not picked yet: suggestedCategory(body). */
  category: AuthorCategory | null;
  body: string;
  footer: string;
  vars: DraftVar[];
  buttons: EditButton[];
}

export const emptyAuthorDraft = (): AuthorDraft => ({
  key: '', category: null, body: '', footer: '', vars: [], buttons: [],
});

/** The category shown and posted: the author's pick, else the one the text suggests. */
export const categoryOf = (draft: AuthorDraft): AuthorCategory =>
  draft.category ?? suggestedCategory(draft.body);

/** POST /messaging/templates/authored's body; templateAuthorSchema checks it first. */
export function toAuthorInput(draft: AuthorDraft) {
  const params = varsOf(draft).map((v, i) => ({ name: `var_${String(i + 1)}`, sample: v.sample }));
  const buttons = draft.buttons.map((b) => ({ type: 'quick_reply' as const, text: b.text }));
  const { key, body, footer } = draft;
  return { key, category: categoryOf(draft), body, footer, params, buttons };
}
