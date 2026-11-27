import type { PortalPayment } from '@ab/shared';

export interface PaymentsListProps {
  payments: readonly PortalPayment[];
  tz: string;
}
