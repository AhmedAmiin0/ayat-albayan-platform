import type { PortalPayment } from '@ab/shared';
import { t } from '@ab/mobile-kit';

export const KIND_WORD: Record<PortalPayment['kind'], () => string> = {
  payment: () => t.portal.app.package.paid,
  refund: () => t.portal.app.package.refund,
};
