import { NUMBER_PURPOSES, WA_PROVIDERS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { EvolutionFields } from './EvolutionFields';
import { isEvolution, type DraftErrors, type NumberDraft } from './number-form';

const f = t.numbers.fields;
const ID_FIELDS = ['phone_number_id', 'waba_id', 'app_id'] as const;
type IdField = (typeof ID_FIELDS)[number];
const INSTANCE = { label: t.numbers.evolution.instance, hint: t.numbers.evolution.instanceHint };

/** An Evolution number has only the instance name (in phone_number_id); others the Meta ids. */
const idsOf = (draft: NumberDraft): readonly IdField[] =>
  isEvolution(draft) ? ['phone_number_id'] : ID_FIELDS;
const idText = (draft: NumberDraft, id: IdField) =>
  isEvolution(draft) ? INSTANCE : { label: f[id], hint: undefined };

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

/**
 * The add / edit fields: name, role (a calls number says it is Kapso only), provider, then the Meta
 * ids (LTR, latin only), or on Evolution the instance name, the engine and its switch.
 */
export function NumberFormFields({ draft, errors, onChange }: NumberFormFieldsProps) {
  return (
    <div className="grid gap-4">
      <Field label={f.label} required error={errors.label}>
        {(p) => <Input {...p} value={draft.label} maxLength={60} onChange={(e) => onChange({ label: e.target.value })} />}
      </Field>
      <Field
        label={f.purpose}
        hint={draft.purpose === 'calls' ? t.numbers.form.callsHint : undefined}
      >
        {(p) => (
          <Select
            {...p}
            value={draft.purpose}
            onChange={(e) => {
              const purpose = NUMBER_PURPOSES.find((l) => l === e.target.value) ?? draft.purpose;
              onChange({ purpose });
            }}
          >
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
      {idsOf(draft).map((id) => (
        <Field
          key={id}
          {...idText(draft, id)}
          required={id === 'phone_number_id'}
          error={errors[id]}
        >
          {(p) => (
            <Input {...p} dir="ltr" spellCheck={false} className="font-mono" value={draft[id]} onChange={(e) => onChange(idPatch(id, e.target.value))} />
          )}
        </Field>
      ))}
      {isEvolution(draft) && <EvolutionFields draft={draft} onChange={onChange} />}
    </div>
  );
}
