import { t, FilterPills, Section } from '@ab/mobile-kit';

export type PayMethod = 'bank' | 'online';

interface PayMethodPillsProps {
  value: PayMethod;
  onChange: (method: PayMethod) => void;
}

/** Shown only in a Stripe build with the API's switch on. */
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
