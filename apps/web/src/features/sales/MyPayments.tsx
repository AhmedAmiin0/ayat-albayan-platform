import { useQuery } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { myPaymentsQuery } from './api';
import { myPaymentColumns } from './my-payment-columns';
import { PortalList } from './PortalList';

/** /sales/payments «مدفوعاتي»: the payments I recorded and no others (the API answers only for me). */
export function MyPayments() {
  return (
    <PortalList
      title={t.assistantPortal.payments.title}
      query={useQuery(myPaymentsQuery)}
      columns={myPaymentColumns}
      getRowId={(p) => p.id}
      empty={{ title: t.assistantPortal.payments.empty, hint: t.assistantPortal.payments.emptyHint }}
    />
  );
}
