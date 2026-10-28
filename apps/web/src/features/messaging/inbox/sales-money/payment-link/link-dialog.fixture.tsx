import { minLinkAmount, type PaymentLinkQuoteView, type SalesFamilyStudent, type ThreadView } from '@ab/shared';
import { vi, type Mock } from 'vitest';
import { renderWithClient } from '../../testing/test-utils';
import { thread } from '../../testing/inbox-fixture';
import { SALES_QUOTE, student } from '../sales-money-fixture';
import { linkView } from '@/features/sales/sales/money/links/link.fixture';
import { PaymentLinkDialog } from './PaymentLinkDialog';

// The «رابط دفع» dialog's specs (not app code): the quote and the create answered by path.

export const LINK_QUOTE: PaymentLinkQuoteView = { quote: SALES_QUOTE, max_discount_pct: 10, min_amount: minLinkAmount(SALES_QUOTE.afterDiscount, 10) };
export const CREATED = linkView({ amount: 270, reference_price: SALES_QUOTE.afterDiscount });

export function answer(apiSend: Mock, quote: PaymentLinkQuoteView = LINK_QUOTE) {
  apiSend.mockImplementation(async (_method: string, path: string) => (path.endsWith('/quote') ? quote : CREATED));
}

type Open = { students?: SalesFamilyStudent[]; chat?: Partial<ThreadView> };

export function openDialog({ students = [student()], chat = {} }: Open = {}) {
  const onClose = vi.fn();
  renderWithClient(<PaymentLinkDialog thread={thread({ session_open: true, ...chat })} students={students} onClose={onClose} />);
  return onClose;
}
