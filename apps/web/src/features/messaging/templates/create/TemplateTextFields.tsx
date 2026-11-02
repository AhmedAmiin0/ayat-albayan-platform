import { TEMPLATE_LIMITS, WA_LINES } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { controlClass, Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import type { TemplateDraft } from './template-draft';

const S = t.templates.create;
const CATEGORIES = ['utility', 'marketing'] as const;

export interface DraftFieldsProps {
  draft: TemplateDraft;
  set: (patch: Partial<TemplateDraft>) => void;
  /** The field's error text when the last save refused it (by top-level name: key, body…). */
  error: (field: string) => string | undefined;
}

const max = (text: string, n: number) => text.replace('{max}', String(n));

/** Name, number, category and language: what Meta knows the template by (fixed once saved). */
export function IdentityFields({ draft, set, error }: DraftFieldsProps) {
  const line = (v: string) => set({ line: WA_LINES.find((l) => l === v) ?? draft.line });
  const category = (v: string) => {
    set({ category: CATEGORIES.find((c) => c === v) ?? draft.category });
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={S.key} hint={S.keyHint} required error={error('key')}>
        {(p) => (
          <Input {...p} dir="ltr" autoComplete="off" spellCheck={false} value={draft.key} onChange={(e) => set({ key: e.target.value })} />
        )}
      </Field>
      <Field label={S.line}>
        {(p) => (
          <Select {...p} value={draft.line} onChange={(e) => line(e.target.value)}>
            {WA_LINES.map((l) => (
              <option key={l} value={l}>
                {t.enums.waLine[l]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={S.category}>
        {(p) => (
          <Select {...p} value={draft.category} onChange={(e) => category(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.enums.templateCategory[c]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={S.language} hint={S.languageHint} required error={error('language')}>
        {(p) => <Input {...p} dir="ltr" autoComplete="off" spellCheck={false} value={draft.language} onChange={(e) => set({ language: e.target.value })} />}
      </Field>
    </div>
  );
}

/** Header, text and footer: the words WhatsApp shows, {{n}} only in the text. */
export function ContentFields({ draft, set, error }: DraftFieldsProps) {
  return (
    <div className="grid gap-4">
      <Field label={S.header} hint={max(S.headerHint, TEMPLATE_LIMITS.header)} error={error('header')}>
        {(p) => <Input {...p} dir="auto" maxLength={TEMPLATE_LIMITS.header} value={draft.header} onChange={(e) => set({ header: e.target.value })} />}
      </Field>
      <Field label={S.body} hint={S.bodyHint} required error={error('body')}>
        {(p) => (
          <textarea
            {...p}
            rows={6}
            dir="auto"
            value={draft.body}
            maxLength={TEMPLATE_LIMITS.body}
            onChange={(e) => set({ body: e.target.value })}
            className={cn(controlClass, 'min-h-32 resize-y py-2 leading-normal')}
          />
        )}
      </Field>
      <Field label={S.footer} hint={max(S.footerHint, TEMPLATE_LIMITS.footer)} error={error('footer')}>
        {(p) => <Input {...p} dir="auto" maxLength={TEMPLATE_LIMITS.footer} value={draft.footer} onChange={(e) => set({ footer: e.target.value })} />}
      </Field>
    </div>
  );
}
