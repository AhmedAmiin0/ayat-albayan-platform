import { hasAttachments, hasReceipt, isPdfName, isPdfReceipt } from './receipt-file';

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

test('attachments: any bank payment, or one with a stored receipt; cash without one has none', () => {
  expect(hasAttachments({ method: 'bank', receipt_path: null })).toBe(true);
  expect(hasAttachments({ method: 'bank' })).toBe(true);
  expect(hasAttachments({ method: 'cash', receipt_path: 'a/b.jpg' })).toBe(true);
  expect(hasAttachments({ method: 'cash', receipt_path: null })).toBe(false);
  expect(hasAttachments({ method: 'cash' })).toBe(false);
});

test('a PDF name: by extension, the query string ignored', () => {
  expect(isPdfName('https://x.co/a.PDF?token=1')).toBe(true);
  expect(isPdfName('https://x.co/a.jpg?name=b.pdf')).toBe(false);
});
