import { hasReceipt, isPdfReceipt } from './receipt-file';

test('a receipt or the booking invoice counts; neither does not', () => {
  expect(hasReceipt({ receipt_path: 'a/b.jpg', invoice_id: null })).toBe(true);
  expect(hasReceipt({ receipt_path: null, invoice_id: 'inv1' })).toBe(true);
  expect(hasReceipt({ receipt_path: null, invoice_id: null })).toBe(false);
});

test('a PDF is told by the stored path or by the signed URL (invoices have no path)', () => {
  expect(isPdfReceipt({ receipt_path: 'sub/slip.PDF' })).toBe(true);
  expect(isPdfReceipt({ receipt_path: 'sub/slip.jpg' })).toBe(false);
  expect(isPdfReceipt({ receipt_path: null }, 'https://x.co/inv.pdf?token=a')).toBe(true);
  expect(isPdfReceipt({ receipt_path: null }, 'https://x.co/inv.png?token=a.pdf')).toBe(false);
  expect(isPdfReceipt({ receipt_path: null })).toBe(false);
});
