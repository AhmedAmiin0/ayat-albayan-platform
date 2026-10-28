import { PAYMENT_LINK_KINDS, type SalesFamilyStudent } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '@/inbox';
import { Section } from '@/more';
import { AmountField, currencyName } from '@/payments';
import { fill } from '@/sales';
import { PricingInputs } from '@/subscribe';
import { ChildPills } from '../components/ChildPills';
import { LinkCreated } from './LinkCreated';
import { LinkPriceSection } from './LinkPriceSection';
import { linkErrorText } from './link-text';
import { useLinkForm } from './use-link-form';

interface PaymentLinkFormProps {
  phone: string;
  /** Her students of the family (at least one). */
  students: readonly SalesFamilyStudent[];
  onSent: () => void;
}

const pl = t.paymentLinks;
const KINDS = PAYMENT_LINK_KINDS.map((k) => ({ value: k, label: pl.kind[k] }));

/**
 * «رابط دفع» (docs/30): the child, new / renewal, the subscribe calculator's inputs (the site's discount pills
 * only, as the sales subscribe), the reference price, the agreed amount (the reference by default; > 0 and
 * not below the admin's minimum), «إنشاء الرابط»; then the link to send or copy (LinkCreated).
 */
export function PaymentLinkForm({ phone, students, onSent }: PaymentLinkFormProps) {
  const f = useLinkForm(students);
  if (f.link) return <LinkCreated link={f.link} phone={phone} onSent={onSent} />;
  const currency = f.priced?.quote.currency;
  return (
    <>
      <ChildPills students={students} value={f.studentId} onChange={f.pick} />
      <Section title={pl.mobile.kind}>
        <FilterPills wrap role="radiogroup" accessibilityLabel={pl.mobile.kind} items={KINDS} value={f.kind} onChange={f.setKind} />
      </Section>
      <PricingInputs form={f.form} freeDiscount={false} onChange={f.patchForm} />
      {f.studentId ? <LinkPriceSection quote={f.quote} /> : null}
      {currency ? (
        <AmountField
          label={fill(pl.agreedAmount, { currency: currencyName(currency) })}
          value={f.amountText}
          onChange={f.setAmount}
          currency={currency}
          {...(f.amountError ? { error: f.amountError } : {})}
        />
      ) : null}
      {f.create.isError ? <ErrorLine message={linkErrorText(f.create.error)} /> : null}
      <Button
        label={f.create.isPending ? pl.creating : pl.create}
        busy={f.create.isPending}
        disabled={!f.priced}
        onPress={f.submit}
      />
    </>
  );
}
