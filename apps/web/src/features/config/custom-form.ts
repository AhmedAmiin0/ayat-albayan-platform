import { customConfigUpsertSchema, customKeySchema, type CustomConfigUpsert, type CustomConfigView } from '@ab/shared';
import { t } from '@/lib/i18n';

/** The add/edit form's boxes (the value is JSON text). */
export interface CustomDraft {
  key: string;
  value: string;
  description: string;
  isPublic: boolean;
}

export interface CustomDraftErrors {
  key?: string;
  value?: string;
}
export type CustomDraftResult =
  | { ok: true; key: string; body: CustomConfigUpsert }
  | { ok: false; errors: CustomDraftErrors };

export const emptyDraft = (): CustomDraft => ({ key: '', value: '', description: '', isPublic: false });

export const draftOf = (e: CustomConfigView): CustomDraft => ({
  key: e.key,
  value: JSON.stringify(e.value, null, 2),
  description: e.description ?? '',
  isPublic: e.isPublic,
});

const c = t.config.custom;
const VALUE_MESSAGES: Record<string, string> = { null_value: c.nullValue, too_large: c.tooLarge };

/** Validates with the API's own schemas, so the screen and the server never disagree. */
export function parseDraft(d: CustomDraft): CustomDraftResult {
  const errors: CustomDraftErrors = {};
  const key = customKeySchema.safeParse(d.key.trim());
  if (!key.success) errors.key = key.error.issues.some((i) => i.message === 'reserved_key') ? c.reservedKey : c.invalidKey;
  let value: unknown;
  try {
    value = JSON.parse(d.value);
  } catch {
    errors.value = c.invalidJson;
  }
  const body = !errors.value && customConfigUpsertSchema.safeParse({ value, description: d.description.trim() || null, isPublic: d.isPublic });
  if (body && !body.success) errors.value = VALUE_MESSAGES[body.error.issues[0]?.message ?? ''] ?? c.invalidJson;
  if (errors.key || errors.value || !body || !body.success || !key.success) return { ok: false, errors };
  return { ok: true, key: key.data, body: body.data };
}

/** Does the search box's text match the entry's key or description? */
export function matchesCustom(e: CustomConfigView, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || `${e.key} ${e.description ?? ''}`.toLowerCase().includes(needle);
}
