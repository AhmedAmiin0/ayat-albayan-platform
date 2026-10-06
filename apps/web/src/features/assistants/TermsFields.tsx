import { ASSISTANT_COMMISSION_TYPES } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { CurrencySelect } from './CurrencySelect';
import { fieldError } from './status';
import type { TermsErrors, TermsForm } from './terms-form';

type Props = {
  form: TermsForm;
  errors: TermsErrors;
  set: (patch: Partial<TermsForm>) => void;
  /** The earliest start day of each part (a new part: today; a saved one: its day). */
  mins?: { salary: string; commission: string };
};

const T = t.assistants.terms;

/** The salary block, then the commission block (type, value, currency for a fixed one, start day). */
export function TermsFields({ form, errors, set, mins }: Props) {
  const fixed = form.commType === 'fixed';
  return (
    <>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-ink">{t.assistants.salary}</legend>
        <Field label={T.salaryAmount} error={fieldError(errors.salaryAmount)}>
          {(p) => <Input {...p} type="text" inputMode="decimal" dir="ltr" value={form.salaryAmount} onChange={(e) => set({ salaryAmount: e.target.value })} />}
        </Field>
        <CurrencySelect label={T.salaryCurrency} value={form.salaryCurrency} onChange={(salaryCurrency) => set({ salaryCurrency })} />
        <Field label={T.salaryStartsOn} error={fieldError(errors.salaryStartsOn)}>
          {(p) => <Input {...p} type="date" dir="ltr" min={mins?.salary} value={form.salaryStartsOn} onChange={(e) => set({ salaryStartsOn: e.target.value })} />}
        </Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink">{t.assistants.commission}</legend>
        <Field label={T.commissionType}>
          {(p) => (
            <Select {...p} value={form.commType} onChange={(e) => set({ commType: e.target.value as TermsForm['commType'] })}>
              <option value="">{T.none}</option>
              {ASSISTANT_COMMISSION_TYPES.map((k) => (
                <option key={k} value={k}>
                  {T[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {form.commType !== '' && (
          <Field label={fixed ? T.valueFixed : T.valuePercent} error={fieldError(errors.commValue)}>
            {(p) => <Input {...p} type="text" inputMode="decimal" dir="ltr" value={form.commValue} onChange={(e) => set({ commValue: e.target.value })} />}
          </Field>
        )}
        {fixed && (
          <CurrencySelect label={T.commissionCurrency} value={form.commCurrency} error={fieldError(errors.commCurrency)} onChange={(commCurrency) => set({ commCurrency })} />
        )}
        {form.commType !== '' && (
          <Field label={T.commissionStartsOn} error={fieldError(errors.commStartsOn)}>
            {(p) => <Input {...p} type="date" dir="ltr" min={mins?.commission} value={form.commStartsOn} onChange={(e) => set({ commStartsOn: e.target.value })} />}
          </Field>
        )}
      </fieldset>
    </>
  );
}
