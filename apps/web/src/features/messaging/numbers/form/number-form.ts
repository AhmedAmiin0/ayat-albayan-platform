import { callsNeedKapso, META_ID_RE, type NumberCreate, type NumberPurpose, type NumberUpdate, type NumberView, type WaProvider } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/** The add / edit dialog's fields as typed (ids trimmed on submit; empty optional ids are null). */
export interface NumberDraft {
  label: string;
  purpose: NumberPurpose;
  provider: WaProvider;
  phone_number_id: string;
  waba_id: string;
  app_id: string;
}

export type DraftField = keyof NumberDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

/** A new number starts as a notifications number on Meta; an edit starts from the record. */
export function draftOf(view?: NumberView): NumberDraft {
  if (!view) return { label: '', purpose: 'notifications', provider: 'meta', phone_number_id: '', waba_id: '', app_id: '' };
  const { label, purpose, provider, phone_number_id } = view;
  return { label, purpose, provider, phone_number_id, waba_id: view.waba_id ?? '', app_id: view.app_id ?? '' };
}

const LABEL_MAX = 60;

/** Each field's problem in words (the API checks the same: label 1–60, ids META_ID_RE, a calls number on Kapso). */
export function draftErrors(draft: NumberDraft): DraftErrors {
  const out: DraftErrors = {};
  const label = draft.label.trim();
  if (label === '' || label.length > LABEL_MAX) out.label = t.common.required;
  if (!META_ID_RE.test(draft.phone_number_id.trim())) out.phone_number_id = t.numbers.form.invalidId;
  if (callsNeedKapso(draft)) out.provider = t.numbers.errors.calls_need_kapso;
  for (const f of ['waba_id', 'app_id'] as const) {
    const v = draft[f].trim();
    if (v !== '' && !META_ID_RE.test(v)) out[f] = t.numbers.form.invalidId;
  }
  return out;
}

const optional = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** POST /admin/numbers body from a valid draft (a new number starts disabled). */
export function createBody(draft: NumberDraft): NumberCreate {
  return {
    label: draft.label.trim(),
    purpose: draft.purpose,
    provider: draft.provider,
    phone_number_id: draft.phone_number_id.trim(),
    waba_id: optional(draft.waba_id),
    app_id: optional(draft.app_id),
    enabled: false,
  };
}

const KEYS = ['label', 'purpose', 'provider', 'phone_number_id', 'waba_id', 'app_id'] as const;

/** PATCH body: only the fields that differ from the record (empty = nothing changed). */
export function updateBody(view: NumberView, draft: NumberDraft): NumberUpdate {
  const next = createBody(draft);
  const changed = KEYS.filter((k) => (next[k] ?? null) !== view[k]);
  return Object.fromEntries(changed.map((k) => [k, next[k] ?? null])) as NumberUpdate;
}
