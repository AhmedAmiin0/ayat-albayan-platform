import { t } from '@/core/lib/i18n/i18n';
import { INVOICE } from '../shared/fixtures';
import { invoiceKind, invoiceStudents, invoiceSubtitle } from './invoice-text';

test('students are joined, a booking without one says so', () => {
  const two = INVOICE(1, { students: [{ id: 'a', name: 'سهيلة', code: 'AB-1' }, { id: 'b', name: 'محمد', code: 'AB-2' }] });
  expect(invoiceStudents(two)).toBe(`سهيلة${t.common.listSeparator}محمد`);
  expect(invoiceStudents(INVOICE(2, { students: [] }))).toBe(t.mobileFinance.invoices.noStudents);
});

test('kind and source in words, with the Riyadh day first', () => {
  expect(invoiceKind(INVOICE(1))).toBe(`${t.finance.invoicePackage} · ${t.mobileFinance.invoices.sourceUpload}`);
  expect(invoiceKind(INVOICE(1, { kind: 'makeup', source: 'whatsapp' }))).toBe(
    `${t.finance.invoiceMakeup} · ${t.mobileFinance.invoices.sourceWhatsapp}`,
  );
  expect(invoiceSubtitle(INVOICE(1))).toBe(`3 أكتوبر 2026 · ${invoiceKind(INVOICE(1))}`);
});
