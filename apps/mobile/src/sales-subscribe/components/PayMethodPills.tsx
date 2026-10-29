import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Section } from '@/more';

export type PayMethod = 'bank' | 'online';

interface PayMethodPillsProps {
  value: PayMethod;
  onChange: (method: PayMethod) => void;
}

/**
 * «طريقة الدفع» (owner 2026-10-29): «تحويل بنكي» (the package now, then its transfer) or «دفع إلكتروني» (a
 * Stripe link for the same package). Shown only where both exist: the Stripe test build with the API's switch on.
 */
export function PayMethodPills({ value, onChange }: PayMethodPillsProps) {
  const items = [
    { value: 'bank' as const, label: t.enums.paymentMethod.bank },
    { value: 'online' as const, label: t.salesMoney.payOnline },
  ];
  return (
    <Section title={t.payments.method}>
      <FilterPills wrap role="radiogroup" accessibilityLabel={t.payments.method} items={items} value={value} onChange={onChange} />
    </Section>
  );
}
