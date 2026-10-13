import type { PaymentAttachmentView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { attachmentRows, isPdfAttachment } from './attachments';

const row = (over: Partial<PaymentAttachmentView>): PaymentAttachmentView => ({
  id: 'a',
  mime: 'image/jpeg',
  size: 9,
  url: 'https://signed/a.jpg?t=1',
  expires_at: '',
  legacy: false,
  ...over,
});

test('the mime decides; without one (a legacy row) the URL`s .pdf does', () => {
  expect(isPdfAttachment(row({ mime: 'application/pdf', url: 'https://s/x' }))).toBe(true);
  expect(isPdfAttachment(row({ mime: 'image/png', url: 'https://s/x.pdf' }))).toBe(false);
  expect(isPdfAttachment(row({ mime: null, url: 'https://s/slip.PDF?token=1' }))).toBe(true);
  expect(isPdfAttachment(row({ mime: null, url: 'https://s/slip.jpg?name=a.pdf' }))).toBe(false);
});

test('labels: «الإيصال» for the legacy one, the new files numbered from 1', () => {
  const rows = attachmentRows([
    row({ id: 'receipt', legacy: true, mime: null }),
    row({ id: 'a1' }),
    row({ id: 'a2', mime: 'application/pdf' }),
  ]);
  expect(rows.map((r) => r.label)).toEqual([
    t.payments.legacyReceipt,
    t.payments.attachmentN.replace('{n}', '1'),
    t.payments.attachmentN.replace('{n}', '2'),
  ]);
  expect(rows.map((r) => r.pdf)).toEqual([false, false, true]);
});
