import { NUMBER_PURPOSES, WA_PROVIDERS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import type { DraftErrors, NumberDraft } from './number-form';

const f = t.numbers.fields;
const ID_FIELDS = ['phone_number_id', 'waba_id', 'app_id'] as const;

const idPatch = (id: (typeof ID_FIELDS)[number], value: string): Partial<NumberDraft> => {
  const patch: Partial<NumberDraft> = {};
  patch[id] = value;
  return patch;
};

export interface NumberFormFieldsProps {
  draft: NumberDraft;
  errors: DraftErrors;
  onChange: (patch: Partial<NumberDraft>) => void;
}

/** The add / edit fields: name, role (a calls number says it is Kapso only), provider, then the Meta ids (LTR, latin only). */
export function NumberFormFields({ draft, errors, onChange }: NumberFormFieldsProps) {
  return (
    <div className="grid gap-4">
      <Field label={f.label} required error={errors.label}>
        {(p) => <Input {...p} value={draft.label} maxLength={60} onChange={(e) => onChange({ label: e.target.value })} />}
      </Field>
      <Field label={f.purpose} hint={draft.purpose === 'calls' ? t.numbers.form.callsHint : undefined}>
        {(p) => (
          <Select {...p} value={draft.purpose} onChange={(e) => onChange({ purpose: NUMBER_PURPOSES.find((l) => l === e.target.value) ?? draft.purpose })}>
            {NUMBER_PURPOSES.map((l) => (
              <option key={l} value={l}>{t.numbers.purpose[l]}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={f.provider} error={errors.provider}>
        {(p) => (
          <Select {...p} value={draft.provider} onChange={(e) => onChange({ provider: WA_PROVIDERS.find((v) => v === e.target.value) ?? draft.provider })}>
            {WA_PROVIDERS.map((v) => (
              <option key={v} value={v}>{t.numbers.provider[v]}</option>
            ))}
          </Select>
        )}
      </Field>
      {ID_FIELDS.map((id) => (
        <Field key={id} label={f[id]} required={id === 'phone_number_id'} error={errors[id]}>
          {(p) => (
            <Input {...p} dir="ltr" spellCheck={false} className="font-mono" value={draft[id]} onChange={(e) => onChange(idPatch(id, e.target.value))} />
          )}
        </Field>
      ))}
    </div>
  );
}
