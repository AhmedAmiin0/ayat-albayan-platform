import { DISCOUNTS, PAYMENT_LINK_KINDS, type PaymentLinkView, type SalesFamilyStudent } from '@ab/shared';
import { useId, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { Dialog } from '@/components/ui/overlay/dialog';
import { currencySymbol, PricingFields } from '@/features/finance/subscriptions';
import { fillText, paymentLinkErrorText } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';
import { ChildPicker } from '../subscribe/ChildPicker';
import { LinkQuote } from './LinkQuote';
import { useLinkForm } from './use-link-form';

const P = t.paymentLinks;

type Props = { students: SalesFamilyStudent[]; onClose: () => void; onCreated: (link: PaymentLinkView) => void };

/** Step 1 of «رابط دفع»: the kind, her student, the package (the subscribe step's inputs), the reference and the agreed amount. */
export function LinkForm({ students, onClose, onCreated }: Props) {
  const formId = useId();
  const f = useLinkForm({ students, onCreated });
  const currency = f.quote.data?.quote.currency;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    f.submit();
  };
  return (
    <Dialog
      title={P.title}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={!f.studentId || !f.ready}>
            {f.create.isPending ? P.creating : P.create}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        <p className="justify-self-start rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-ink">{P.testBadge}</p>
        <SegmentedControl label={P.web.kind} options={PAYMENT_LINK_KINDS.map((k) => ({ value: k, label: P.kind[k] }))} value={f.kind} onChange={f.setKind} />
        <ChildPicker students={students} value={f.studentId} onChange={f.pick} />
        <PricingFields form={f.form} discounts={DISCOUNTS} set={f.setPricing} />
        {f.studentId && <LinkQuote quote={f.quote.data} fetching={f.quote.isFetching} error={f.quote.error} />}
        {f.quote.data && (
          <Field label={fillText(P.agreedAmount, { currency: currencySymbol(currency ?? '') })} {...(f.amountError ? { error: f.amountError } : {})}>
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="decimal"
                dir="ltr"
                min={0}
                step="0.01"
                className="max-w-[220px] tabular-nums"
                value={f.amount}
                onChange={(e) => f.setAmount(e.target.value)}
              />
            )}
          </Field>
        )}
        {f.create.isError && <FormAlert>{paymentLinkErrorText(f.create.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
