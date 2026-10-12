import { ASSISTANT_COMMISSION_TYPES, type AssistantCommissionType } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Section } from '@/more/Section';
import { FormLabel } from '@/payments/FormLabel';
import { Field } from '@/ui/Field';
import { FilterPills } from '@/ui/FilterPills';
import { CurrencyPills } from './CurrencyPills';
import { fieldError } from './errors';
import type { TermsFieldsProps } from './SalaryFields';
import { StartDayPicker } from './StartDayPicker';

const T = t.assistants.terms;

/** The commission block (web TermsFields): none / percent / fixed, the value, a fixed one's currency, the start day. */
export function CommissionFields({ form, errors, set, min }: TermsFieldsProps) {
  const fixed = form.commType === 'fixed';
  const types: { value: '' | AssistantCommissionType; label: string }[] = [
    { value: '', label: T.none },
    ...ASSISTANT_COMMISSION_TYPES.map((k) => ({ value: k, label: T[k] })),
  ];
  const valueError = fieldError(errors.commValue);
  return (
    <Section title={t.assistants.commission}>
      <View style={{ gap: 6 }}>
        <FormLabel>{T.commissionType}</FormLabel>
        <FilterPills role="radiogroup" accessibilityLabel={T.commissionType} items={types} value={form.commType} onChange={(commType) => set({ commType })} wrap />
      </View>
      {form.commType !== '' ? (
        <View style={{ gap: 6 }}>
          <Field label={fixed ? T.valueFixed : T.valuePercent} ltr keyboardType="decimal-pad" value={form.commValue} onChangeText={(commValue) => set({ commValue })} />
          {valueError ? <ErrorLine message={valueError} /> : null}
        </View>
      ) : null}
      {fixed ? (
        <CurrencyPills label={T.commissionCurrency} value={form.commCurrency} onChange={(commCurrency) => set({ commCurrency })} error={fieldError(errors.commCurrency)} />
      ) : null}
      {form.commType !== '' ? (
        <StartDayPicker label={T.commissionStartsOn} day={form.commStartsOn} min={min} onChange={(commStartsOn) => set({ commStartsOn })} error={fieldError(errors.commStartsOn)} />
      ) : null}
    </Section>
  );
}
