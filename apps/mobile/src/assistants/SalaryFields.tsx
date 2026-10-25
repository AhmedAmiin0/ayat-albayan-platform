import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/more/Section';
import { Field } from '@/core/ui/form/Field';
import { CurrencyPills } from './CurrencyPills';
import { fieldError } from './errors';
import { StartDayPicker } from './StartDayPicker';
import type { TermsErrors, TermsForm } from './terms-form';

export interface TermsFieldsProps {
  form: TermsForm;
  errors: TermsErrors;
  set: (patch: Partial<TermsForm>) => void;
  /** The earliest start day of the part (a new part: today; a saved one: its day). */
  min: string;
}

const T = t.assistants.terms;

/** The salary block (web TermsFields): monthly amount (empty clears it), currency, start day. */
export function SalaryFields({ form, errors, set, min }: TermsFieldsProps) {
  const amountError = fieldError(errors.salaryAmount);
  return (
    <Section title={t.assistants.salary}>
      <View style={{ gap: 6 }}>
        <Field label={T.salaryAmount} ltr keyboardType="decimal-pad" value={form.salaryAmount} onChangeText={(salaryAmount) => set({ salaryAmount })} />
        {amountError ? <ErrorLine message={amountError} /> : null}
      </View>
      <CurrencyPills label={T.salaryCurrency} value={form.salaryCurrency} onChange={(salaryCurrency) => set({ salaryCurrency })} />
      <StartDayPicker label={T.salaryStartsOn} day={form.salaryStartsOn} min={min} onChange={(salaryStartsOn) => set({ salaryStartsOn })} error={fieldError(errors.salaryStartsOn)} />
    </Section>
  );
}
