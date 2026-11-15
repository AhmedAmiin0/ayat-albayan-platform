import { AUTHOR_CATEGORIES } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { KeyField } from '@/features/messaging/templates/create/KeyField';
import { t } from '@/lib/i18n/i18n';
import { categoryOf, type AuthorDraft } from './author-draft';

const S = t.templates.author;

export interface AuthorFieldsProps {
  draft: AuthorDraft;
  set: (patch: Partial<AuthorDraft>) => void;
  error: (field: string) => string | undefined;
}

/** The optional Meta name and the category (picked from the text until the author changes it). */
export function AuthorFields({ draft, set, error }: AuthorFieldsProps) {
  const pick = (v: string) => set({ category: AUTHOR_CATEGORIES.find((c) => c === v) ?? null });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <KeyField
        label={S.key}
        hint={S.keyHint}
        value={draft.key}
        onChange={(key) => set({ key })}
        error={error('key')}
      />
      <Field label={t.templates.create.category} hint={S.categoryHint}>
        {(p) => (
          <Select {...p} value={categoryOf(draft)} onChange={(e) => pick(e.target.value)}>
            {AUTHOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {S.categories[c]}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
